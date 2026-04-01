import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaService } from "../common/database/prisma.service";

// Identificação obrigatória da IA em todas as respostas
const AI_DISCLAIMER = "🤖 *Esta mensagem foi respondida pela IA configurada pelo(a) criador(a). Não é uma resposta real do(a) criador(a).*";

const MAX_FAQ_ENTRIES = 20;
const MAX_DAILY_AI_MSGS = 50; // por fã por dia

interface FaqEntry {
  q: string;
  a: string;
}

@Injectable()
export class AiPersonaService {
  private readonly logger = new Logger(AiPersonaService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private prisma:  PrismaService,
    private config:  ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: config.get("app.anthropic.apiKey") ?? "",
    });
  }

  // ─── Configurar persona ───────────────────────────────────

  async upsertPersona(
    creatorId: string,
    data: {
      displayName:  string;
      voiceTone:    string;
      systemPrompt: string;
      faqEntries?:  FaqEntry[];
      enabled?:     boolean;
    },
  ) {
    const faq = data.faqEntries ?? [];
    if (faq.length > MAX_FAQ_ENTRIES) {
      throw new BadRequestException(`Máximo de ${MAX_FAQ_ENTRIES} entradas no FAQ`);
    }

    return this.prisma.aiPersona.upsert({
      where:  { creatorId },
      create: { creatorId, ...data, faqEntries: faq as unknown as any },
      update: { ...data, faqEntries: faq as unknown as any },
    });
  }

  async getPersona(creatorId: string) {
    return this.prisma.aiPersona.findUnique({ where: { creatorId } });
  }

  // ─── Responder mensagem de fã (Item 37) ──────────────────

  async replyAsPersona(
    creatorId: string,
    fanId:     string,
    userMsg:   string,
  ): Promise<string> {
    const persona = await this.prisma.aiPersona.findUnique({ where: { creatorId } });
    if (!persona?.enabled) {
      throw new NotFoundException("Este criador não tem IA persona ativa");
    }

    // Rate limit por fã
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const msgCount = await this.prisma.aiPersonaMessage.count({
      where: { personaId: persona.id, userId: fanId, createdAt: { gte: today } },
    });
    if (msgCount >= MAX_DAILY_AI_MSGS) {
      throw new ForbiddenException("Limite diário de mensagens com a IA atingido");
    }

    // Verifica FAQ primeiro (resposta instantânea sem chamar API)
    const faq = (persona.faqEntries as unknown as FaqEntry[]) ?? [];
    const matched = faq.find(
      (f) => userMsg.toLowerCase().includes(f.q.toLowerCase()),
    );

    let reply: string;
    let modelUsed: string;

    if (matched) {
      reply     = `${matched.a}\n\n${AI_DISCLAIMER}`;
      modelUsed = "faq";
    } else {
      // Chama Claude Haiku (rápido e barato para este caso de uso)
      const systemContent = [
        `Você é a IA pessoal da criadora "${persona.displayName}".`,
        `Tom de voz: ${persona.voiceTone}`,
        `\n${persona.systemPrompt}`,
        `\nIMPORTANTE: Sempre termine suas respostas com exatamente esta linha:`,
        AI_DISCLAIMER,
      ].join("\n");

      try {
        const response = await this.anthropic.messages.create({
          model:      "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system:     systemContent,
          messages:   [{ role: "user", content: userMsg }],
        });

        reply     = (response.content[0] as any).text ?? "";
        modelUsed = "claude-haiku-4-5";
      } catch (err) {
        this.logger.error("Erro na chamada à API Anthropic:", err);
        reply     = `Não consegui responder agora. Tente novamente mais tarde.\n\n${AI_DISCLAIMER}`;
        modelUsed = "error-fallback";
      }
    }

    // Persiste para auditoria
    await this.prisma.aiPersonaMessage.create({
      data: { personaId: persona.id, userId: fanId, userMsg, aiReply: reply, modelUsed },
    });

    return reply;
  }

  async getPersonaHistory(creatorId: string, page = 1, limit = 50) {
    const persona = await this.prisma.aiPersona.findUnique({ where: { creatorId } });
    if (!persona) throw new NotFoundException();

    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.aiPersonaMessage.findMany({
        where:   { personaId: persona.id },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: { id: true, userId: true, userMsg: true, aiReply: true, modelUsed: true, createdAt: true },
      }),
      this.prisma.aiPersonaMessage.count({ where: { personaId: persona.id } }),
    ]);

    return { items, total, pagination: { page, limit, pages: Math.ceil(total / limit) } };
  }
}
