import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { HealthModule } from "../src/common/health/health.module";
import { PrismaService } from "../src/common/database/prisma.service";
import { RedisService } from "../src/common/redis/redis.service";

const mockPrisma: any = {
  $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
};

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
};

describe("HealthController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("health controller should be defined", () => {
    expect(app).toBeDefined();
  });
});
