import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

let helmet: any;
try { helmet = require("helmet"); } catch {}
let expressJson: any, expressUrlencoded: any;
try { const e = require("express"); expressJson = e.json; expressUrlencoded = e.urlencoded; } catch {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  // Security headers
  if (helmet) app.use(helmet({ contentSecurityPolicy: false }));

  // Trust proxy (for running behind reverse proxy / load balancer)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", 1);

  // Request size limits
  if (expressJson) app.use(expressJson({ limit: "10mb" }));
  if (expressUrlencoded) app.use(expressUrlencoded({ extended: true, limit: "10mb" }));

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Graceful shutdown
  app.enableShutdownHooks();

  // Prefixo global da API
  app.setGlobalPrefix("api");

  // Versionamento via header ou URL
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  // Validação automática de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // remove campos não declarados no DTO
      forbidNonWhitelisted: true, // erro se campos extras forem enviados
      transform: true,            // converte tipos automaticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Swagger (apenas em desenvolvimento)
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Inti.mate API")
      .setDescription("API da plataforma de conteúdo para criadores")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    console.log(`📄 Swagger disponível em: http://localhost:${process.env.PORT ?? 3001}/api/docs`);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 API rodando em: http://localhost:${port}/api/v1`);
}

bootstrap();
