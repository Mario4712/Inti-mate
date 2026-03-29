import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;
  private mediaBucket: string;
  private kycBucket: string;
  private cdnBaseUrl: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      endpoint: config.get("app.s3.endpoint"),
      region:   config.get("app.s3.region"),
      credentials: {
        accessKeyId:     config.get("app.s3.accessKey")!,
        secretAccessKey: config.get("app.s3.secretKey")!,
      },
      forcePathStyle: true, // necessário para MinIO
    });

    this.mediaBucket  = config.get("app.s3.bucketMedia")!;
    this.kycBucket    = config.get("app.s3.bucketKyc")!;
    this.cdnBaseUrl   = config.get("app.s3.cdnBaseUrl")!;
  }

  // ─── Upload de mídia ─────────────────────────────────────

  async uploadMedia(
    buffer: Buffer,
    mimeType: string,
    folder: string,  // ex: "creators/abc123/photos"
  ): Promise<{ key: string; url: string }> {
    const ext  = this.extFromMime(mimeType);
    const key  = `${folder}/${uuidv4()}${ext}`;

    await this.s3.send(new PutObjectCommand({
      Bucket:      this.mediaBucket,
      Key:         key,
      Body:        buffer,
      ContentType: mimeType,
      // Sem ACL público — acesso via CDN assinada ou pre-signed URL
    }));

    this.logger.log(`Upload: ${key}`);
    return { key, url: `${this.cdnBaseUrl}/${key}` };
  }

  // ─── URL assinada (acesso temporário a conteúdo privado) ──

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.mediaBucket,
      Key:    key,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  // ─── Upload de documentos KYC (bucket restrito) ──────────

  async uploadKycDocument(
    buffer: Buffer,
    mimeType: string,
    userId: string,
    docType: string,
  ): Promise<string> {
    const ext = this.extFromMime(mimeType);
    const key = `${userId}/${docType}-${uuidv4()}${ext}`;

    await this.s3.send(new PutObjectCommand({
      Bucket:      this.kycBucket,
      Key:         key,
      Body:        buffer,
      ContentType: mimeType,
    }));

    // Retorna apenas a key, nunca uma URL pública
    return key;
  }

  // ─── Delete ──────────────────────────────────────────────

  async deleteMedia(key: string) {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.mediaBucket,
      Key:    key,
    }));
    this.logger.log(`Deleted: ${key}`);
  }

  // ─── Helpers ─────────────────────────────────────────────

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      "image/jpeg":  ".jpg",
      "image/png":   ".png",
      "image/webp":  ".webp",
      "video/mp4":   ".mp4",
      "video/webm":  ".webm",
      "application/pdf": ".pdf",
    };
    return map[mime] ?? "";
  }

  publicUrl(key: string): string {
    return `${this.cdnBaseUrl}/${key}`;
  }
}
