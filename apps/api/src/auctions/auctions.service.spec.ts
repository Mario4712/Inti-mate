import { Test, TestingModule } from "@nestjs/testing";
import { AuctionsService } from "./auctions.service";
import { PrismaService } from "../common/database/prisma.service";
import { StorageService } from "../content/storage.service";
import { PagarmeStrategy } from "../payments/strategies/pagarme.strategy";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

const mockPrisma: any = {
  auction: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  auctionBid: {
    create: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
  creatorBalance: {
    upsert: jest.fn(),
  },
  $transaction: jest.fn((cb: any) =>
    typeof cb === "function" ? cb(mockPrisma) : Promise.all(cb),
  ),
};

const mockStorage = {
  getSignedUrl: jest.fn().mockResolvedValue("https://signed-url.test/media"),
};

const mockPagarme = {
  createPixCharge: jest.fn().mockResolvedValue({ qrCode: "qr", txId: "mock_pix_1" }),
};

describe("AuctionsService", () => {
  let service: AuctionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: PagarmeStrategy, useValue: mockPagarme },
      ],
    }).compile();

    service = module.get(AuctionsService);
  });

  describe("create", () => {
    it("should create an auction", async () => {
      const data = {
        title: "Foto exclusiva",
        startingBid: 500,
        endsAt: new Date(Date.now() + 86400000),
      };
      mockPrisma.auction.create.mockResolvedValue({ id: "auc1", ...data, status: "OPEN" });

      const result = await service.create("creator1", data);
      expect(result.status).toBe("OPEN");
      expect(mockPrisma.auction.create).toHaveBeenCalled();
    });

    it("should reject past end date", async () => {
      await expect(
        service.create("creator1", {
          title: "Test",
          startingBid: 500,
          endsAt: new Date("2020-01-01"),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject bid below R$ 1.00", async () => {
      await expect(
        service.create("creator1", {
          title: "Test",
          startingBid: 50,
          endsAt: new Date(Date.now() + 86400000),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("placeBid", () => {
    const openAuction = {
      id: "auc1",
      creatorId: "creator1",
      status: "OPEN",
      currentBid: 500,
      endsAt: new Date(Date.now() + 86400000),
    };

    it("should place a valid bid", async () => {
      mockPrisma.auction.findUnique.mockResolvedValue(openAuction);
      mockPrisma.auctionBid.create.mockResolvedValue({});
      mockPrisma.auction.update.mockResolvedValue({});

      const result = await service.placeBid("auc1", "bidder1", 700);
      expect(result.currentBid).toBe(700);
    });

    it("should reject bid below minimum step", async () => {
      mockPrisma.auction.findUnique.mockResolvedValue(openAuction);

      await expect(service.placeBid("auc1", "bidder1", 550)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should reject self-bidding by creator", async () => {
      mockPrisma.auction.findUnique.mockResolvedValue(openAuction);

      await expect(service.placeBid("auc1", "creator1", 700)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should reject bid on closed auction", async () => {
      mockPrisma.auction.findUnique.mockResolvedValue({ ...openAuction, status: "CLOSED" });

      await expect(service.placeBid("auc1", "bidder1", 700)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should reject bid on non-existent auction", async () => {
      mockPrisma.auction.findUnique.mockResolvedValue(null);

      await expect(service.placeBid("auc999", "bidder1", 700)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getAuction", () => {
    it("should return auction with bids", async () => {
      mockPrisma.auction.findUnique.mockResolvedValue({
        id: "auc1",
        bids: [{ id: "b1", amount: 700 }],
      });

      const result = await service.getAuction("auc1");
      expect(result.bids).toHaveLength(1);
    });

    it("should throw NotFoundException for missing auction", async () => {
      mockPrisma.auction.findUnique.mockResolvedValue(null);
      await expect(service.getAuction("xxx")).rejects.toThrow(NotFoundException);
    });
  });

  describe("deliverToWinner", () => {
    it("should generate signed URL for winner", async () => {
      mockPrisma.auction.findFirst.mockResolvedValue({
        id: "auc1",
        creatorId: "c1",
        winnerId: "w1",
        status: "PAID",
      });
      mockPrisma.auction.update.mockResolvedValue({});

      const result = await service.deliverToWinner("c1", "auc1", "media/key.jpg");
      expect(result.deliveryUrl).toContain("signed-url");
    });

    it("should reject if auction not paid", async () => {
      mockPrisma.auction.findFirst.mockResolvedValue(null);
      await expect(service.deliverToWinner("c1", "auc1", "key")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
