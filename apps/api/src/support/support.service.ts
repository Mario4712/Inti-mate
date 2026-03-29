import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../common/database/prisma.service";

// Perguntas frequentes com respostas automatizadas
const FAQ: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ["assinar", "assinatura", "plano", "subscribe"],
    answer:
      "Para assinar um criador, acesse o perfil dele e clique em 'Assinar'. Você pode escolher entre planos mensais, trimestrais ou anuais. O pagamento é processado de forma segura.",
  },
  {
    keywords: ["cancelar", "cancel", "desistir"],
    answer:
      "Para cancelar sua assinatura, acesse Configurações > Assinaturas > [Nome do Criador] > Cancelar. O acesso continua até o fim do período já pago.",
  },
  {
    keywords: ["saque", "retirada", "pix", "withdraw"],
    answer:
      "Saques são processados em D+14 via PIX. O valor mínimo é R$20. Acesse Financeiro > Saques para solicitar. É necessário ter KYC aprovado.",
  },
  {
    keywords: ["verificação", "kyc", "identidade", "documento"],
    answer:
      "A verificação de identidade (KYC) é obrigatória para criadores monetizarem. Acesse Perfil > Verificação e envie seus documentos. O processo leva até 48 horas.",
  },
  {
    keywords: ["reembolso", "devolução", "chargeback"],
    answer:
      "Reembolsos são analisados em até 5 dias úteis. Entre em contato pelo e-mail suporte@inti.mate com o número da transação.",
  },
  {
    keywords: ["senha", "acesso", "login", "esqueci"],
    answer:
      "Para redefinir sua senha, clique em 'Esqueci minha senha' na tela de login. Um e-mail será enviado com as instruções.",
  },
  {
    keywords: ["taxa", "comissão", "plataforma", "fee"],
    answer:
      "A plataforma retém 20% de todas as transações como taxa de serviço. Esse valor cobre custos de processamento, armazenamento e suporte.",
  },
  {
    keywords: ["denúncia", "reportar", "abuso", "ilegal"],
    answer:
      "Para reportar conteúdo inadequado ou ilegal, use o botão '⚠️ Denunciar' em qualquer conteúdo ou perfil. Nossa equipe analisa todas as denúncias em até 24 horas.",
  },
];

const ESCALATION_KEYWORDS = [
  "humano",
  "atendente",
  "pessoa",
  "falar com alguém",
  "urgente",
  "urgência",
  "problema sério",
  "fraude",
];

const BOT_DISCLAIMER =
  "🤖 Sou o assistente virtual da Inti.mate. Posso ajudar com dúvidas comuns, mas para casos complexos vou te conectar com um humano.";

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma:  PrismaService,
    private config:  ConfigService,
  ) {}

  async chat(userId: string, message: string): Promise<{ reply: string; escalated: boolean }> {
    const lower = message.toLowerCase();

    // Verifica se o usuário quer falar com humano
    const wantsHuman = ESCALATION_KEYWORDS.some((kw) => lower.includes(kw));
    if (wantsHuman) {
      await this.createTicket(userId, message);
      return {
        reply:
          "Entendido! Vou te conectar com um membro da nossa equipe. Você receberá uma resposta no seu e-mail em até 24 horas úteis. Número do seu ticket foi criado.",
        escalated: true,
      };
    }

    // Busca resposta no FAQ
    const matched = FAQ.find((entry) =>
      entry.keywords.some((kw) => lower.includes(kw)),
    );

    if (matched) {
      return { reply: matched.answer, escalated: false };
    }

    // Fallback — cria ticket automaticamente
    await this.createTicket(userId, message);
    return {
      reply:
        "Não encontrei uma resposta automática para sua dúvida. Criei um ticket para nossa equipe. Você receberá retorno por e-mail em até 48 horas úteis.",
      escalated: true,
    };
  }

  async getDisclaimer(): Promise<{ message: string }> {
    return { message: BOT_DISCLAIMER };
  }

  private async createTicket(userId: string, message: string) {
    // Persiste no log de moderação (reutilizando a tabela, pode-se criar SupportTicket depois)
    this.logger.log(`Ticket de suporte criado para usuário ${userId}: ${message.slice(0, 100)}`);

    // TODO: Bloco 7 — integração com Zendesk / Freshdesk / e-mail interno
    // Por ora, apenas loga e cria um registro de ModerationLog com type SUPPORT_TICKET
    await this.prisma.moderationLog.create({
      data: {
        contentId:   userId,
        contentType: "SUPPORT_TICKET",
        action:      "ESCALATED",
        reason:      message.slice(0, 500),
      },
    });
  }
}
