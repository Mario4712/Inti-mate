import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "@elastic/elasticsearch";

export interface CreatorDocument {
  id:           string;
  artisticName: string;
  bio:          string;
  tags:         string[];
  category:     string;
  avatarUrl:    string | null;
  subscriptionPriceMin: number; // menor preço mensal em centavos
  totalSubscribers:     number;
  country:      string;
  createdAt:    string;
}

const CREATORS_INDEX = "creators";

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;

  constructor(private config: ConfigService) {
    const node     = config.get<string>("app.elasticsearch.node")!;
    const username = config.get<string>("app.elasticsearch.username");
    const password = config.get<string>("app.elasticsearch.password");

    this.client = new Client({
      node,
      auth: username && password ? { username, password } : undefined,
    });
  }

  async onModuleInit() {
    try {
      await this.ensureIndex();
    } catch (err) {
      this.logger.warn("Elasticsearch indisponível na inicialização — busca degradada:", err);
    }
  }

  // ─── Index management ────────────────────────────────────

  private async ensureIndex() {
    const exists = await this.client.indices.exists({ index: CREATORS_INDEX });
    if (!exists) {
      await this.client.indices.create({
        index: CREATORS_INDEX,
        mappings: {
          properties: {
            id:           { type: "keyword" },
            artisticName: { type: "text", analyzer: "portuguese", fields: { keyword: { type: "keyword" } } },
            bio:          { type: "text", analyzer: "portuguese" },
            tags:         { type: "keyword" },
            category:     { type: "keyword" },
            avatarUrl:    { type: "keyword", index: false },
            subscriptionPriceMin: { type: "integer" },
            totalSubscribers:     { type: "integer" },
            country:      { type: "keyword" },
            createdAt:    { type: "date" },
          },
        },
        settings: {
          analysis: {
            analyzer: {
              portuguese: {
                type:      "custom",
                tokenizer: "standard",
                filter:    ["lowercase", "portuguese_stop", "portuguese_stemmer"],
              },
            },
            filter: {
              portuguese_stop:    { type: "stop",    stopwords: "_portuguese_" },
              portuguese_stemmer: { type: "stemmer", language:  "light_portuguese" },
            },
          },
        },
      });
      this.logger.log(`Índice '${CREATORS_INDEX}' criado`);
    }
  }

  // ─── Indexar / atualizar criador ─────────────────────────

  async indexCreator(doc: CreatorDocument) {
    await this.client.index({
      index: CREATORS_INDEX,
      id:    doc.id,
      document: doc,
    });
  }

  async deleteCreator(creatorId: string) {
    await this.client.delete({ index: CREATORS_INDEX, id: creatorId }).catch(() => {});
  }

  // ─── Busca ────────────────────────────────────────────────

  async searchCreators(params: {
    q?:            string;
    tags?:         string[];
    category?:     string;
    maxPriceCents?: number;
    country?:      string;
    page:          number;
    limit:         number;
  }): Promise<{ items: CreatorDocument[]; total: number }> {
    const { q, tags, category, maxPriceCents, country, page, limit } = params;
    const from = (page - 1) * limit;

    const must: any[]   = [];
    const filter: any[] = [];

    if (q?.trim()) {
      must.push({
        multi_match: {
          query:  q,
          fields: ["artisticName^3", "bio", "tags^2"],
          fuzziness: "AUTO",
        },
      });
    }

    if (tags?.length) {
      filter.push({ terms: { tags } });
    }

    if (category) {
      filter.push({ term: { category } });
    }

    if (maxPriceCents) {
      filter.push({ range: { subscriptionPriceMin: { lte: maxPriceCents } } });
    }

    if (country) {
      filter.push({ term: { country } });
    }

    const response = await this.client.search<CreatorDocument>({
      index: CREATORS_INDEX,
      from,
      size:  limit,
      query: {
        bool: {
          must:   must.length   ? must   : [{ match_all: {} }],
          filter: filter.length ? filter : undefined,
        },
      },
      sort: q ? undefined : [{ totalSubscribers: "desc" }],
    });

    const total = typeof response.hits.total === "number"
      ? response.hits.total
      : (response.hits.total as any)?.value ?? 0;

    return {
      total,
      items: response.hits.hits.map((h) => h._source as CreatorDocument),
    };
  }

  // ─── Autocomplete de tags ─────────────────────────────────

  async suggestTags(prefix: string, limit = 10): Promise<string[]> {
    const response = await this.client.search({
      index: CREATORS_INDEX,
      size:  0,
      query: { match_all: {} },
      aggs:  {
        tag_suggestions: {
          terms: {
            field:   "tags",
            include: `${prefix.toLowerCase()}.*`,
            size:    limit,
          },
        },
      },
    });

    const buckets = (response.aggregations?.tag_suggestions as any)?.buckets ?? [];
    return buckets.map((b: any) => b.key as string);
  }
}
