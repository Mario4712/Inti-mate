import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  emailVerified: boolean;
}

/**
 * Google OAuth2 strategy for social login.
 * Validates Google ID tokens (from frontend Sign-In button)
 * and returns the user profile.
 */
@Injectable()
export class GoogleStrategy {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly clientId: string;

  constructor(private config: ConfigService) {
    this.clientId = this.config.get("app.google.clientId") ?? "";
  }

  /**
   * Validates a Google ID token received from the frontend.
   * Uses Google's tokeninfo endpoint to verify without the full SDK.
   */
  async validateIdToken(idToken: string): Promise<GoogleProfile | null> {
    if (!this.clientId) {
      this.logger.warn("Google OAuth nao configurado (GOOGLE_CLIENT_ID ausente)");
      return null;
    }

    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );

      if (!response.ok) {
        this.logger.warn(`Google token validation failed: ${response.status}`);
        return null;
      }

      const payload: any = await response.json();

      // Verifica se o token e para nosso client ID
      if (payload.aud !== this.clientId) {
        this.logger.warn("Google token: audience mismatch");
        return null;
      }

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email.split("@")[0],
        picture: payload.picture ?? "",
        emailVerified: payload.email_verified === "true",
      };
    } catch (err) {
      this.logger.error("Erro ao validar Google token:", err);
      return null;
    }
  }
}
