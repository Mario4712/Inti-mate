import { Injectable, NestMiddleware, Logger } from "@nestjs/common";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: any, res: any, next: () => void) {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const requestId = req.headers["x-request-id"] as string;
    const userAgent = req.headers["user-agent"] ?? "";

    res.on("finish", () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      // JSON structured log
      const logEntry = {
        requestId,
        method,
        url: originalUrl,
        status: statusCode,
        duration,
        ip,
        userAgent: userAgent.substring(0, 100),
      };

      if (statusCode >= 500) {
        this.logger.error(JSON.stringify(logEntry));
      } else if (statusCode >= 400) {
        this.logger.warn(JSON.stringify(logEntry));
      } else if (process.env.NODE_ENV !== "production" || duration > 1000) {
        // In production, only log slow requests (>1s) or errors
        this.logger.log(JSON.stringify(logEntry));
      }
    });

    next();
  }
}
