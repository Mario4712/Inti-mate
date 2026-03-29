import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3001", 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    bucketMedia: process.env.S3_BUCKET_MEDIA ?? "media",
    bucketKyc: process.env.S3_BUCKET_KYC ?? "kyc-documents",
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    cdnBaseUrl: process.env.CDN_BASE_URL,
  },

  smtp: {
    host: process.env.SMTP_HOST ?? "localhost",
    port: parseInt(process.env.SMTP_PORT ?? "1025", 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? "Inti.mate <noreply@inti.mate>",
  },

  kyc: {
    provider: process.env.KYC_PROVIDER ?? "mock",
    unicoClientId: process.env.UNICO_CLIENT_ID,
    unicoClientSecret: process.env.UNICO_CLIENT_SECRET,
  },

  csam: {
    provider: process.env.CSAM_PROVIDER ?? "local",
    photoDnaApiKey: process.env.PHOTODNA_API_KEY,
  },

  totp: {
    appName: process.env.TOTP_APP_NAME ?? "Inti.mate",
  },

  pagarme: { apiKey: process.env.PAGARME_API_KEY },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  frontendUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
}));
