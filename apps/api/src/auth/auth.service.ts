import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { addDays, addMinutes } from "date-fns";
import { PrismaService } from "../common/database/prisma.service";
import { RedisService } from "../common/redis/redis.service";
import { EmailService } from "./email.service";
import { TwoFactorService } from "./two-factor.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ConsentType, Role } from "@intimare/database";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly MAX_LOGIN_ATTEMPTS = 5;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
    private twoFactorService: TwoFactorService,
  ) {}

  // ─── Registro ────────────────────────────────────────────

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    // Validação dos aceites obrigatórios
    if (!dto.acceptTerms || !dto.acceptPrivacyPolicy || !dto.declareAdult) {
      throw new BadRequestException(
        "Aceite dos Termos de Uso, Política de Privacidade e declaração de maioridade são obrigatórios",
      );
    }

    // Verifica e-mail duplicado
    const emailExists = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (emailExists) {
      throw new ConflictException("E-mail já cadastrado");
    }

    // Hash do CPF para deduplicação (nunca armazenamos o CPF em texto claro)
    const cpfHash = this.hashCpf(dto.cpf);
    const cpfExists = await this.prisma.user.findUnique({ where: { cpfHash } });
    if (cpfExists) {
      throw new ConflictException("CPF já cadastrado");
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Criação do usuário + perfil + verificação de idade + registros de consentimento
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          role: dto.role ?? Role.CONSUMER,
          cpfHash,
          cpfEncrypted: this.encryptCpf(dto.cpf),
          profile: {
            create: {
              artisticName: dto.artisticName ?? null,
              isCreator: dto.role === Role.CREATOR,
            },
          },
          ageVerification: {
            create: {
              type: dto.role === Role.CREATOR ? "DOCUMENT" : "DECLARATION",
              declarationAt: dto.role !== Role.CREATOR ? new Date() : null,
            },
          },
        },
      });

      // Registros de consentimento LGPD
      await tx.consentRecord.createMany({
        data: [
          {
            userId: newUser.id,
            type: ConsentType.TERMS_OF_SERVICE,
            version: "tos-v1.0",
            accepted: dto.acceptTerms,
            ipAddress,
            userAgent,
          },
          {
            userId: newUser.id,
            type: ConsentType.PRIVACY_POLICY,
            version: "pp-v1.0",
            accepted: dto.acceptPrivacyPolicy,
            ipAddress,
            userAgent,
          },
          {
            userId: newUser.id,
            type: ConsentType.AGE_VERIFICATION,
            version: "age-v1.0",
            accepted: dto.declareAdult,
            ipAddress,
            userAgent,
          },
        ],
      });

      return newUser;
    });

    // Envia e-mail de verificação
    await this.sendEmailVerification(user.id, user.email);

    this.logger.log(`Novo usuário registrado: ${user.id} (${user.role})`);

    return {
      message: "Cadastro realizado. Verifique seu e-mail para ativar a conta.",
      userId: user.id,
    };
  }

  // ─── Login ───────────────────────────────────────────────

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Rate limiting por IP + email
    const attemptKey = `${ipAddress}:${dto.email.toLowerCase()}`;
    const attempts = await this.redis.getLoginAttempts(attemptKey);

    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException(
        "Muitas tentativas de login. Aguarde 15 minutos.",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });

    if (!user) {
      await this.redis.incrementLoginAttempts(attemptKey);
      throw new UnauthorizedException("Credenciais inválidas");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.redis.incrementLoginAttempts(attemptKey);
      throw new UnauthorizedException("Credenciais inválidas");
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        "E-mail não verificado. Cheque sua caixa de entrada.",
      );
    }

    if (user.status === "SUSPENDED" || user.status === "BANNED") {
      throw new UnauthorizedException("Conta suspensa ou banida.");
    }

    // Valida 2FA se habilitado
    if (user.twoFactorEnabled) {
      if (!dto.totpCode) {
        return { requiresTwoFactor: true };
      }
      const valid = this.twoFactorService.verify(user.twoFactorSecret!, dto.totpCode);
      if (!valid) {
        await this.redis.incrementLoginAttempts(attemptKey);
        throw new UnauthorizedException("Código 2FA inválido");
      }
    }

    // Reset de tentativas após login bem-sucedido
    await this.redis.resetLoginAttempts(attemptKey);

    // Gera tokens
    const tokens = await this.generateTokens(user.id, user.role, ipAddress, userAgent);

    this.logger.log(`Login: ${user.id}`);
    return tokens;
  }

  // ─── Refresh token ───────────────────────────────────────

  async refreshTokens(refreshToken: string) {
    let payload: { sub: string; sessionId: string };

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get("app.jwt.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException("Refresh token inválido ou expirado");
    }

    const isValid = await this.redis.isRefreshTokenValid(payload.sub, payload.sessionId);
    if (!isValid) {
      throw new UnauthorizedException("Sessão revogada");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user || user.status === "BANNED") {
      throw new UnauthorizedException("Usuário inválido");
    }

    // Rotaciona o refresh token (revoga o antigo, gera novo)
    await this.redis.revokeRefreshToken(payload.sub, payload.sessionId);
    await this.prisma.session.updateMany({
      where: { userId: payload.sub, refreshToken },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(user.id, user.role);
  }

  // ─── Logout ──────────────────────────────────────────────

  async logout(userId: string, sessionId: string, jti: string, tokenTtl: number) {
    await this.redis.revokeRefreshToken(userId, sessionId);
    await this.redis.blacklistAccessToken(jti, tokenTtl);
    await this.prisma.session.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
    this.logger.log(`Logout: ${userId}`);
  }

  // ─── Verificação de e-mail ───────────────────────────────

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Token inválido ou expirado");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, status: "ACTIVE" },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: "E-mail verificado com sucesso" };
  }

  async sendEmailVerification(userId: string, email: string) {
    // Invalida tokens anteriores
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, type: "email_verify", usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = uuidv4();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        type: "email_verify",
        expiresAt: addMinutes(new Date(), 60), // 1 hora
      },
    });

    await this.emailService.sendEmailVerification(email, token);
  }

  // ─── Configuração de 2FA ─────────────────────────────────

  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.twoFactorEnabled) {
      throw new BadRequestException("2FA já habilitado");
    }

    const { secret, qrCodeUrl } = await this.twoFactorService.generateSecret(user.email);

    // Armazena secret temporariamente no Redis até confirmação
    await this.redis.set(`2fa_setup:${userId}`, secret, 600); // 10 min

    return { qrCodeUrl, secret };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const secret = await this.redis.get(`2fa_setup:${userId}`);
    if (!secret) {
      throw new BadRequestException("Sessão de configuração 2FA expirada. Reinicie o processo.");
    }

    const valid = this.twoFactorService.verify(secret, code);
    if (!valid) {
      throw new BadRequestException("Código inválido");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: this.encryptSecret(secret),
      },
    });

    await this.redis.del(`2fa_setup:${userId}`);

    return { message: "2FA habilitado com sucesso" };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("2FA não está habilitado");
    }

    const secret = this.decryptSecret(user.twoFactorSecret);
    const valid = this.twoFactorService.verify(secret, code);
    if (!valid) throw new UnauthorizedException("Código 2FA inválido");

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return { message: "2FA desabilitado" };
  }

  // ─── Helpers privados ────────────────────────────────────

  private async generateTokens(
    userId: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const sessionId = uuidv4();
    const jti = uuidv4();

    const accessToken = this.jwtService.sign(
      { sub: userId, role, jti },
      { secret: this.config.get("app.jwt.accessSecret") },
    );

    const refreshExpiresIn = this.config.get("app.jwt.refreshExpiresIn") as string;
    const refreshTtlSeconds = this.parseDuration(refreshExpiresIn);

    const refreshToken = this.jwtService.sign(
      { sub: userId, sessionId },
      {
        secret: this.config.get("app.jwt.refreshSecret"),
        expiresIn: refreshExpiresIn,
      },
    );

    await this.redis.setRefreshToken(userId, sessionId, refreshTtlSeconds);

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt: addDays(new Date(), refreshTtlSeconds / 86400),
        ipAddress,
        userAgent,
      },
    });

    return { accessToken, refreshToken, sessionId };
  }

  private hashCpf(cpf: string): string {
    const salt = process.env.JWT_ACCESS_SECRET ?? "default_salt";
    return crypto.createHmac("sha256", salt).update(cpf).digest("hex");
  }

  private encryptCpf(cpf: string): string {
    // AES-256-GCM para armazenamento seguro
    const key = Buffer.from((process.env.JWT_ACCESS_SECRET ?? "").padEnd(32, "0").slice(0, 32));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(cpf, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
  }

  private encryptSecret(secret: string): string {
    return this.encryptCpf(secret); // reuso da mesma lógica AES
  }

  private decryptSecret(encrypted: string): string {
    const [ivHex, tagHex, dataHex] = encrypted.split(":");
    const key = Buffer.from((process.env.JWT_ACCESS_SECRET ?? "").padEnd(32, "0").slice(0, 32));
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data).toString("utf8") + decipher.final("utf8");
  }

  private parseDuration(duration: string): number {
    const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 604800; // 7d padrão
    return parseInt(match[1]) * (units[match[2]] ?? 1);
  }
}
