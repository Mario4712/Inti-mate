import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get("app.smtp.host"),
      port: this.config.get("app.smtp.port"),
      auth:
        this.config.get("app.smtp.user")
          ? {
              user: this.config.get("app.smtp.user"),
              pass: this.config.get("app.smtp.pass"),
            }
          : undefined,
    });
  }

  async sendEmailVerification(email: string, token: string) {
    const frontendUrl = this.config.get("app.frontendUrl");
    const link = `${frontendUrl}/auth/verify-email?token=${token}`;

    await this.send({
      to: email,
      subject: "Confirme seu e-mail – Inti.mate",
      html: `
        <h2>Bem-vindo à Inti.mate</h2>
        <p>Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.</p>
        <p>
          <a href="${link}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Confirmar e-mail
          </a>
        </p>
        <p>O link expira em <strong>1 hora</strong>.</p>
        <p style="color:#888;font-size:12px;">Se não se cadastrou, ignore este e-mail.</p>
      `,
    });
  }

  async sendPasswordChangeConfirmation(email: string, token: string) {
    const frontendUrl = this.config.get("app.frontendUrl");
    const link = `${frontendUrl}/auth/confirm-password-change?token=${token}`;

    await this.send({
      to: email,
      subject: "Confirme a alteração de senha – Inti.mate",
      html: `
        <h2>Confirmar alteração de senha</h2>
        <p>Recebemos uma solicitação para alterar sua senha. Clique no botão abaixo para confirmar.</p>
        <p>
          <a href="${link}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Confirmar nova senha
          </a>
        </p>
        <p>O link expira em <strong>30 minutos</strong>.</p>
        <p style="color:#888;font-size:12px;">Se não solicitou esta alteração, ignore este e-mail — sua senha permanece a mesma.</p>
      `,
    });
  }

  async sendPasswordReset(email: string, token: string) {
    const frontendUrl = this.config.get("app.frontendUrl");
    const link = `${frontendUrl}/auth/reset-password?token=${token}`;

    await this.send({
      to: email,
      subject: "Redefinir senha – Inti.mate",
      html: `
        <h2>Redefinição de senha</h2>
        <p>Clique no botão abaixo para redefinir sua senha.</p>
        <p>
          <a href="${link}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Redefinir senha
          </a>
        </p>
        <p>O link expira em <strong>30 minutos</strong>.</p>
        <p style="color:#888;font-size:12px;">Se não solicitou, ignore este e-mail.</p>
      `,
    });
  }

  private async send({ to, subject, html }: { to: string; subject: string; html: string }) {
    try {
      const from = this.config.get("app.smtp.from");
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`E-mail enviado para ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${to}:`, err);
      // Não relança — falha de e-mail não deve derrubar o fluxo principal
    }
  }
}
