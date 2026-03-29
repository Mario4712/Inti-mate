import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";

@Injectable()
export class TwoFactorService {
  constructor(private config: ConfigService) {}

  async generateSecret(email: string) {
    const appName = this.config.get("app.totp.appName") ?? "Inti.mate";

    const secret = speakeasy.generateSecret({
      name: `${appName} (${email})`,
      length: 32,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  }

  verify(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1, // tolera 30s de diferença de clock
    });
  }
}
