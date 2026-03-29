import { Injectable, Logger } from "@nestjs/common";
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import * as os from "os";

const execFileAsync = promisify(execFile);

export interface ProcessedVideo {
  hlsDir:       string;   // diretório local com segments + manifest
  thumbnailBuf: Buffer;   // frame thumbnail
  durationSec:  number;
}

export interface ProcessedImage {
  optimized: Buffer;
  thumbnail: Buffer;
  width:     number;
  height:    number;
}

@Injectable()
export class MediaProcessorService {
  private readonly logger = new Logger(MediaProcessorService.name);

  // ─── Imagem ──────────────────────────────────────────────

  async processImage(input: Buffer, mimeType: string): Promise<ProcessedImage> {
    // Em produção: usar sharp para redimensionar e otimizar
    // Aqui retornamos o buffer original (sharp não está no package.json base)
    // para não bloquear o desenvolvimento — adicionar sharp na Fase de produção
    this.logger.debug(`Processando imagem (${(input.length / 1024).toFixed(1)} KB)`);
    return {
      optimized: input,
      thumbnail: input,   // TODO: gerar thumbnail 300x300 com sharp
      width:     0,
      height:    0,
    };
  }

  // ─── Vídeo HLS ───────────────────────────────────────────

  /**
   * Transcodifica vídeo para HLS adaptativo usando FFmpeg.
   * Gera três rendições: 360p, 720p, 1080p.
   * Requer FFmpeg instalado na máquina / container.
   */
  async processVideo(inputBuffer: Buffer): Promise<ProcessedVideo> {
    const tmpDir    = await fs.mkdtemp(path.join(os.tmpdir(), "intimare-"));
    const inputPath = path.join(tmpDir, `input_${Date.now()}.mp4`);
    const hlsDir    = path.join(tmpDir, "hls");
    const thumbPath = path.join(tmpDir, "thumb.jpg");

    await fs.mkdir(hlsDir, { recursive: true });
    await fs.writeFile(inputPath, inputBuffer);

    try {
      // Obtém duração
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        inputPath,
      ]);
      const meta     = JSON.parse(stdout);
      const duration = parseFloat(meta.format?.duration ?? "0");

      // Gera thumbnail no segundo 3 (ou metade da duração)
      const thumbSec = Math.min(3, duration / 2);
      await execFileAsync("ffmpeg", [
        "-y", "-i", inputPath,
        "-ss", String(thumbSec),
        "-vframes", "1",
        "-vf", "scale=640:-1",
        thumbPath,
      ]);

      // Transcodificação HLS multi-bitrate
      await execFileAsync("ffmpeg", [
        "-y", "-i", inputPath,

        // 360p
        "-map", "0:v", "-map", "0:a?",
        "-vf:0", "scale=-2:360", "-c:v:0", "libx264", "-b:v:0", "800k",
        "-c:a:0", "aac", "-b:a:0", "96k",

        // 720p
        "-map", "0:v", "-map", "0:a?",
        "-vf:1", "scale=-2:720", "-c:v:1", "libx264", "-b:v:1", "2500k",
        "-c:a:1", "aac", "-b:a:1", "128k",

        // 1080p
        "-map", "0:v", "-map", "0:a?",
        "-vf:2", "scale=-2:1080", "-c:v:2", "libx264", "-b:v:2", "5000k",
        "-c:a:2", "aac", "-b:a:2", "192k",

        "-var_stream_map", "v:0,a:0 v:1,a:1 v:2,a:2",
        "-master_pl_name", "master.m3u8",
        "-f", "hls",
        "-hls_time", "6",
        "-hls_list_size", "0",
        "-hls_segment_filename", path.join(hlsDir, "stream_%v_%03d.ts"),
        path.join(hlsDir, "stream_%v.m3u8"),
      ]);

      const thumbBuf = await fs.readFile(thumbPath);

      return { hlsDir, thumbnailBuf: thumbBuf, durationSec: Math.round(duration) };
    } finally {
      // Limpa arquivos temporários (exceto hlsDir — será enviado pelo caller)
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(thumbPath).catch(() => {});
    }
  }

  async cleanupTmpDir(dir: string) {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
