import { PrismaClient, Role, ConsentType } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 4; // fast for dev
const PASSWORD = "Senha123!"; // same for all demo users

function hashCpf(cpf: string): string {
  const salt = process.env.JWT_ACCESS_SECRET ?? "dev_seed_salt_32chars_long!!!!!";
  return crypto.createHmac("sha256", salt).update(cpf).digest("hex");
}

function encryptCpf(cpf: string): string {
  const key = Buffer.from(
    (process.env.JWT_ACCESS_SECRET ?? "dev_seed_salt_32chars_long!!!!!").padEnd(32, "0").slice(0, 32),
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(cpf, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

async function main() {
  console.log("Seeding database...\n");

  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  // ─── Clean existing seed data ────────────────────────────
  // Order matters due to foreign keys — leaf tables first
  await prisma.storyPollVote.deleteMany({});
  await prisma.storyPollOption.deleteMany({});
  await prisma.storyPoll.deleteMany({});
  await prisma.storyView.deleteMany({});
  await prisma.story.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.liveSession.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.consentRecord.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.withdrawal.deleteMany({});
  await prisma.tip.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.media.deleteMany({});
  await prisma.creatorPlan.deleteMany({});
  await prisma.creatorBalance.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.ageVerification.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.emailVerificationToken.deleteMany({});
  await prisma.user.deleteMany({});

  // ─── Creators ────────────────────────────────────────────

  const creators = await Promise.all([
    createUser(prisma, {
      email: "luna@demo.com",
      username: "luna_art",
      passwordHash,
      role: Role.CREATOR,
      cpf: "11111111111",
      profile: {
        artisticName: "Luna Artista",
        bio: "Artista digital e ilustradora. Compartilho meu processo criativo e tutoriais exclusivos.",
        category: "arte",
        tags: ["ilustracao", "digital", "tutorial"],
        city: "São Paulo",
        state: "SP",
      },
    }),
    createUser(prisma, {
      email: "matheus@demo.com",
      username: "matheus_fit",
      passwordHash,
      role: Role.CREATOR,
      cpf: "22222222222",
      profile: {
        artisticName: "Matheus Fitness",
        bio: "Personal trainer e nutricionista. Treinos exclusivos e planos alimentares personalizados.",
        category: "fitness",
        tags: ["treino", "saude", "nutricao"],
        city: "Rio de Janeiro",
        state: "RJ",
      },
    }),
    createUser(prisma, {
      email: "camila@demo.com",
      username: "camila_music",
      passwordHash,
      role: Role.CREATOR,
      cpf: "33333333333",
      profile: {
        artisticName: "Camila Sounds",
        bio: "Cantora e compositora. Covers, músicas originais e bastidores do estúdio.",
        category: "musica",
        tags: ["musica", "cover", "compositora"],
        city: "Belo Horizonte",
        state: "MG",
      },
    }),
  ]);

  console.log(`Created ${creators.length} creators`);

  // ─── Fans ────────────────────────────────────────────────

  const fans = await Promise.all([
    createUser(prisma, {
      email: "joao@demo.com",
      username: "joao_fan",
      passwordHash,
      role: Role.CONSUMER,
      cpf: "44444444444",
      profile: { artisticName: null, bio: null, category: null, tags: [], city: "Curitiba", state: "PR" },
    }),
    createUser(prisma, {
      email: "maria@demo.com",
      username: "maria_fan",
      passwordHash,
      role: Role.CONSUMER,
      cpf: "55555555555",
      profile: { artisticName: null, bio: null, category: null, tags: [], city: "Salvador", state: "BA" },
    }),
    createUser(prisma, {
      email: "pedro@demo.com",
      username: "pedro_fan",
      passwordHash,
      role: Role.CONSUMER,
      cpf: "66666666666",
      profile: { artisticName: null, bio: null, category: null, tags: [], city: "Recife", state: "PE" },
    }),
    createUser(prisma, {
      email: "ana@demo.com",
      username: "ana_fan",
      passwordHash,
      role: Role.CONSUMER,
      cpf: "77777777777",
      profile: { artisticName: null, bio: null, category: null, tags: [], city: "Fortaleza", state: "CE" },
    }),
    createUser(prisma, {
      email: "carlos@demo.com",
      username: "carlos_fan",
      passwordHash,
      role: Role.CONSUMER,
      cpf: "88888888888",
      profile: { artisticName: null, bio: null, category: null, tags: [], city: "Brasília", state: "DF" },
    }),
  ]);

  console.log(`Created ${fans.length} fans`);

  // ─── Admin ───────────────────────────────────────────────

  const admin = await createUser(prisma, {
    email: "admin@demo.com",
    username: "admin",
    passwordHash,
    role: Role.ADMIN,
    cpf: "99999999999",
    profile: { artisticName: "Admin", bio: "Administrador da plataforma", category: null, tags: [] },
  });
  console.log("Created admin user");

  // ─── Creator Plans ───────────────────────────────────────

  const plans = await Promise.all([
    // Luna's plans
    prisma.creatorPlan.create({
      data: { creatorId: creators[0].id, name: "Básico", description: "Acesso a ilustrações exclusivas", monthlyPrice: 9.9, isActive: true },
    }),
    prisma.creatorPlan.create({
      data: { creatorId: creators[0].id, name: "Premium", description: "Tutoriais + PSD source files", monthlyPrice: 29.9, isActive: true },
    }),
    // Matheus's plans
    prisma.creatorPlan.create({
      data: { creatorId: creators[1].id, name: "Treinos", description: "Acesso aos treinos semanais", monthlyPrice: 14.9, isActive: true },
    }),
    prisma.creatorPlan.create({
      data: { creatorId: creators[1].id, name: "Completo", description: "Treinos + plano alimentar personalizado", monthlyPrice: 49.9, isActive: true },
    }),
    // Camila's plans
    prisma.creatorPlan.create({
      data: { creatorId: creators[2].id, name: "Fã", description: "Bastidores e prévias", monthlyPrice: 7.9, isActive: true },
    }),
    prisma.creatorPlan.create({
      data: { creatorId: creators[2].id, name: "VIP", description: "Acústicos exclusivos + meet & greet virtual", monthlyPrice: 39.9, isActive: true },
    }),
  ]);

  console.log(`Created ${plans.length} plans`);

  // ─── Subscriptions ───────────────────────────────────────

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const subscriptions = await Promise.all([
    prisma.subscription.create({
      data: {
        subscriberId: fans[0].id, creatorId: creators[0].id, planId: plans[0].id,
        status: "ACTIVE", interval: "MONTHLY",
        currentPeriodStart: now, currentPeriodEnd: nextMonth,
      },
    }),
    prisma.subscription.create({
      data: {
        subscriberId: fans[1].id, creatorId: creators[0].id, planId: plans[1].id,
        status: "ACTIVE", interval: "MONTHLY",
        currentPeriodStart: now, currentPeriodEnd: nextMonth,
      },
    }),
    prisma.subscription.create({
      data: {
        subscriberId: fans[2].id, creatorId: creators[1].id, planId: plans[2].id,
        status: "ACTIVE", interval: "MONTHLY",
        currentPeriodStart: now, currentPeriodEnd: nextMonth,
      },
    }),
    prisma.subscription.create({
      data: {
        subscriberId: fans[3].id, creatorId: creators[2].id, planId: plans[4].id,
        status: "ACTIVE", interval: "MONTHLY",
        currentPeriodStart: now, currentPeriodEnd: nextMonth,
      },
    }),
    prisma.subscription.create({
      data: {
        subscriberId: fans[4].id, creatorId: creators[1].id, planId: plans[3].id,
        status: "ACTIVE", interval: "MONTHLY",
        currentPeriodStart: now, currentPeriodEnd: nextMonth,
      },
    }),
  ]);

  console.log(`Created ${subscriptions.length} subscriptions`);

  // ─── Sample Media Content ────────────────────────────────

  const media = await Promise.all([
    prisma.media.create({
      data: {
        creatorId: creators[0].id, type: "PHOTO", title: "Dragão Celestial — Ilustração digital",
        status: "APPROVED", viewCount: 234, thumbnailUrl: null, originalUrl: "https://placehold.co/800x600",
      },
    }),
    prisma.media.create({
      data: {
        creatorId: creators[0].id, type: "VIDEO", title: "Speed paint: Floresta Encantada",
        status: "APPROVED", viewCount: 156, thumbnailUrl: null, originalUrl: "https://placehold.co/800x600",
      },
    }),
    prisma.media.create({
      data: {
        creatorId: creators[1].id, type: "VIDEO", title: "Treino HIIT 30min — Semana 1",
        status: "APPROVED", viewCount: 489, thumbnailUrl: null, originalUrl: "https://placehold.co/800x600",
      },
    }),
    prisma.media.create({
      data: {
        creatorId: creators[1].id, type: "PHOTO", title: "Plano alimentar — Definição muscular",
        status: "APPROVED", viewCount: 312, thumbnailUrl: null, originalUrl: "https://placehold.co/800x600",
      },
    }),
    prisma.media.create({
      data: {
        creatorId: creators[2].id, type: "VIDEO", title: "Cover: Garota de Ipanema (Acústico)",
        status: "APPROVED", viewCount: 678, thumbnailUrl: null, originalUrl: "https://placehold.co/800x600",
      },
    }),
    prisma.media.create({
      data: {
        creatorId: creators[2].id, type: "VIDEO", title: "Making Of — Sessão de gravação",
        status: "APPROVED", viewCount: 102, thumbnailUrl: null, originalUrl: "https://placehold.co/800x600",
      },
    }),
  ]);

  console.log(`Created ${media.length} media items`);

  // ─── Creator Balances ────────────────────────────────────

  await Promise.all([
    prisma.creatorBalance.create({
      data: { creatorId: creators[0].id, availableAmount: 1250, pendingAmount: 180, totalEarned: 3800 },
    }),
    prisma.creatorBalance.create({
      data: { creatorId: creators[1].id, availableAmount: 3420, pendingAmount: 450, totalEarned: 8900 },
    }),
    prisma.creatorBalance.create({
      data: { creatorId: creators[2].id, availableAmount: 890, pendingAmount: 95, totalEarned: 2100 },
    }),
  ]);

  console.log("Created creator balances");

  // ─── Notifications ───────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      { userId: creators[0].id, type: "NEW_SUBSCRIBER", title: "Novo assinante!", body: "joao_fan assinou seu plano Básico", link: "/dashboard/subscribers" },
      { userId: creators[0].id, type: "NEW_SUBSCRIBER", title: "Novo assinante!", body: "maria_fan assinou seu plano Premium", link: "/dashboard/subscribers" },
      { userId: creators[1].id, type: "NEW_SUBSCRIBER", title: "Novo assinante!", body: "pedro_fan assinou seu plano Treinos", link: "/dashboard/subscribers" },
      { userId: fans[0].id, type: "NEW_SUBSCRIBER", title: "Novo conteúdo!", body: "Luna Artista publicou: Dragão Celestial", link: "/creator/luna_art" },
    ],
  });

  console.log("Created notifications");

  // ─── Summary ─────────────────────────────────────────────

  console.log("\n--- Seed complete ---");
  console.log(`Password for all demo accounts: ${PASSWORD}`);
  console.log("\nDemo accounts:");
  console.log("  Creators: luna@demo.com, matheus@demo.com, camila@demo.com");
  console.log("  Fans:     joao@demo.com, maria@demo.com, pedro@demo.com, ana@demo.com, carlos@demo.com");
  console.log("  Admin:    admin@demo.com");
}

// ─── Helper ────────────────────────────────────────────────

async function createUser(
  db: PrismaClient,
  data: {
    email: string;
    username: string;
    passwordHash: string;
    role: Role;
    cpf: string;
    profile: {
      artisticName: string | null;
      bio: string | null;
      category: string | null;
      tags: string[];
      city?: string;
      state?: string;
    };
  },
) {
  return db.user.create({
    data: {
      email: data.email,
      username: data.username,
      passwordHash: data.passwordHash,
      role: data.role,
      status: "ACTIVE",
      emailVerified: true,
      cpfHash: hashCpf(data.cpf),
      cpfEncrypted: encryptCpf(data.cpf),
      profile: {
        create: {
          artisticName: data.profile.artisticName,
          bio: data.profile.bio,
          category: data.profile.category,
          tags: data.profile.tags,
          city: data.profile.city,
          state: data.profile.state,
          isCreator: data.role === Role.CREATOR,
          isPublic: true,
        },
      },
      ageVerification: {
        create: {
          type: data.role === Role.CREATOR ? "DOCUMENT" : "DECLARATION",
          status: "APPROVED",
          declarationAt: new Date(),
        },
      },
      consentRecords: {
        createMany: {
          data: [
            { type: ConsentType.TERMS_OF_SERVICE, version: "tos-v1.0", accepted: true },
            { type: ConsentType.PRIVACY_POLICY, version: "pp-v1.0", accepted: true },
            { type: ConsentType.AGE_VERIFICATION, version: "age-v1.0", accepted: true },
          ],
        },
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
