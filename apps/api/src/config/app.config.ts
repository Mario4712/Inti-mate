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

  totp: {
    appName: process.env.TOTP_APP_NAME ?? "Inti.mate",
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE ?? "http://localhost:9200",
    username: process.env.ELASTICSEARCH_USERNAME ?? "elastic",
    password: process.env.ELASTICSEARCH_PASSWORD ?? "",
  },

  vapid: {
    publicKey:  process.env.VAPID_PUBLIC_KEY  ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  },

  livekit: {
    host:      process.env.LIVEKIT_HOST      ?? "ws://localhost:7880",
    apiKey:    process.env.LIVEKIT_API_KEY   ?? "devkey",
    apiSecret: process.env.LIVEKIT_API_SECRET ?? "devsecret",
  },

  crypto: {
    webhookSecret: process.env.CRYPTO_WEBHOOK_SECRET,
  },

  pagarme: {
    apiKey: process.env.PAGARME_API_KEY,
    webhookSecret: process.env.PAGARME_WEBHOOK_SECRET,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },

  social: {
    instagram: {
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
      userId: process.env.INSTAGRAM_USER_ID,
    },
    twitter: {
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
    },
    tiktok: {
      accessToken: process.env.TIKTOK_ACCESS_TOKEN,
    },
  },

  support: {
    email: process.env.SUPPORT_EMAIL ?? "suporte@inti.mate",
  },

  sentry: {
    dsn: process.env.SENTRY_DSN,
  },

  csam: {
    provider: process.env.CSAM_PROVIDER ?? "local",
    photoDnaApiKey: process.env.PHOTODNA_API_KEY,
    ncmec: {
      username: process.env.NCMEC_USERNAME,
      password: process.env.NCMEC_PASSWORD,
      endpoint: process.env.NCMEC_ENDPOINT,
    },
    safernet: {
      endpoint: process.env.SAFERNET_ENDPOINT,
    },
  },

  frontendUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
}));
