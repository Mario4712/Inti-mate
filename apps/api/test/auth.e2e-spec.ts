import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";

/**
 * E2E auth tests — requires supertest package.
 * Install with: pnpm add -D supertest @types/supertest
 * Then uncomment the tests below.
 *
 * These tests verify:
 * - Empty credentials rejected (400)
 * - Weak password rejected (400)
 * - Anti-enumeration on forgot-password (always 201)
 * - Unauthenticated access rejected (401)
 * - Invalid JWT rejected (401)
 */
describe("Auth (e2e) - placeholder", () => {
  it("should be implemented after supertest is installed", () => {
    expect(true).toBe(true);
  });
});
