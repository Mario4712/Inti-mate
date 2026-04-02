import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "../common/database/prisma.service";
import { RedisService } from "../common/redis/redis.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";
import { TwoFactorService } from "./two-factor.service";
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";

// ─── Mocks ─────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  emailVerificationToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  consentRecord: { createMany: jest.fn() },
  session: { create: jest.fn(), updateMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockRedis = {
  getLoginAttempts: jest.fn().mockResolvedValue(0),
  incrementLoginAttempts: jest.fn(),
  resetLoginAttempts: jest.fn(),
  setRefreshToken: jest.fn(),
  isRefreshTokenValid: jest.fn(),
  revokeRefreshToken: jest.fn(),
  blacklistAccessToken: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue("mock_token"),
  verify: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      "app.jwt.accessSecret": "test-access-secret-32chars-long!",
      "app.jwt.refreshSecret": "test-refresh-secret",
      "app.jwt.refreshExpiresIn": "7d",
    };
    return map[key];
  }),
};

const mockEmail = {
  sendEmailVerification: jest.fn(),
};

const mockTwoFactor = {
  generateSecret: jest.fn(),
  verify: jest.fn(),
};

// ─── Test Suite ────────────────────────────────────────────

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Set env for CPF encryption
    process.env.JWT_ACCESS_SECRET = "test-access-secret-32chars-long!";

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EmailService, useValue: mockEmail },
        { provide: TwoFactorService, useValue: mockTwoFactor },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── register() ────────────────────────────────────────

  describe("register", () => {
    const validDto = {
      email: "test@example.com",
      password: "Str0ng!Pass",
      cpf: "12345678900",
      role: "CONSUMER" as const,
      acceptTerms: true,
      acceptPrivacyPolicy: true,
      declareAdult: true,
    };

    it("should register a new user successfully", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // no email/cpf duplicate
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue({ id: "user-1", role: "CONSUMER", email: "test@example.com" }),
            findUnique: jest.fn().mockResolvedValue(null), // username not taken
          },
          consentRecord: { createMany: jest.fn() },
        };
        return cb(tx);
      });

      const result = await service.register(validDto);

      expect(result.userId).toBe("user-1");
      expect(result.message).toContain("Cadastro realizado");
      expect(mockEmail.sendEmailVerification).toHaveBeenCalledWith("test@example.com", expect.any(String));
    });

    it("should throw BadRequestException if terms not accepted", async () => {
      await expect(
        service.register({ ...validDto, acceptTerms: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException if email exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "existing" }); // email exists

      await expect(service.register(validDto)).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException if CPF exists", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: "existing" }); // cpf check

      await expect(service.register(validDto)).rejects.toThrow(ConflictException);
    });
  });

  // ─── login() ───────────────────────────────────────────

  describe("login", () => {
    const loginDto = { email: "test@example.com", password: "Str0ng!Pass" };
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      passwordHash: "",
      emailVerified: true,
      status: "ACTIVE",
      role: "CONSUMER",
      twoFactorEnabled: false,
    };

    beforeEach(async () => {
      mockUser.passwordHash = await bcrypt.hash("Str0ng!Pass", 4); // fast rounds for tests
    });

    it("should login successfully and return tokens", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockRedis.getLoginAttempts.mockResolvedValue(0);

      const result = await service.login(loginDto, "127.0.0.1");

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(mockRedis.resetLoginAttempts).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for wrong password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: await bcrypt.hash("different", 4),
      });

      await expect(service.login(loginDto, "127.0.0.1")).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRedis.incrementLoginAttempts).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for non-existent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto, "127.0.0.1")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw if rate limited", async () => {
      mockRedis.getLoginAttempts.mockResolvedValue(5);

      await expect(service.login(loginDto, "127.0.0.1")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw if email not verified", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
      });

      await expect(service.login(loginDto, "127.0.0.1")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw if account is suspended", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: "SUSPENDED",
      });

      await expect(service.login(loginDto, "127.0.0.1")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should return requiresTwoFactor if 2FA enabled and no code", async () => {
      mockRedis.getLoginAttempts.mockResolvedValue(0);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: true,
      });

      const result = await service.login(loginDto, "127.0.0.1");

      expect(result).toEqual({ requiresTwoFactor: true });
    });

    it("should validate 2FA code when provided", async () => {
      mockRedis.getLoginAttempts.mockResolvedValue(0);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: true,
        twoFactorSecret: "encrypted_secret",
      });
      mockTwoFactor.verify.mockReturnValue(true);

      const result = await service.login(
        { ...loginDto, totpCode: "123456" },
        "127.0.0.1",
      );

      expect(result).toHaveProperty("accessToken");
      expect(mockTwoFactor.verify).toHaveBeenCalled();
    });
  });

  // ─── verifyEmail() ─────────────────────────────────────

  describe("verifyEmail", () => {
    it("should verify email with valid token", async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        token: "valid-token",
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.verifyEmail("valid-token");

      expect(result.message).toContain("verificado");
    });

    it("should throw for expired token", async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        token: "expired",
        usedAt: null,
        expiresAt: new Date(Date.now() - 3600000), // expired
      });

      await expect(service.verifyEmail("expired")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw for already used token", async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        token: "used",
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      await expect(service.verifyEmail("used")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── logout() ──────────────────────────────────────────

  describe("logout", () => {
    it("should revoke tokens and update session", async () => {
      await service.logout("user-1", "session-1", "jti-1", 3600);

      expect(mockRedis.revokeRefreshToken).toHaveBeenCalledWith("user-1", "session-1");
      expect(mockRedis.blacklistAccessToken).toHaveBeenCalledWith("jti-1", 3600);
      expect(mockPrisma.session.updateMany).toHaveBeenCalled();
    });
  });
});
