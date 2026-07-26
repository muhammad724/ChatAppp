import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Server } from "socket.io";
import { createApp } from "../src/app.js";
import type { Config } from "../src/config.js";

const config: Config = {
  NODE_ENV: "test",
  PORT: 4000,
  DATABASE_URL: "postgresql://test",
  DIRECT_URL: "postgresql://test",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test",
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
  CORS_ORIGINS: "http://localhost:8081",
  MAX_IMAGE_BYTES: 10_485_760
};

function harness(overrides: Record<string, any> = {}) {
  const prisma = {
    user: { findUnique: vi.fn(), upsert: vi.fn() },
    conversationMember: { findUnique: vi.fn() },
    message: { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    conversation: { update: vi.fn() },
    hiddenMessage: { upsert: vi.fn() },
    $transaction: vi.fn(async (callback: any) => typeof callback === "function" ? callback(prisma) : callback),
    ...overrides
  };
  const services = {
    prisma,
    supabase: { auth: { getUser: vi.fn(async (token: string) =>
      token === "valid" ? { data: { user: { id: "11111111-1111-4111-8111-111111111111" } }, error: null } : { data: { user: null }, error: {} }
    ) } },
    cloudinary: { uploader: { destroy: vi.fn() }, utils: { api_sign_request: vi.fn() } }
  } as any;
  const io = new Server();
  const app = createApp(config, services, io);
  return { app, prisma, io };
}

describe("API security and message CRUD", () => {
  it("rejects a missing or invalid Supabase access token", async () => {
    const { app } = harness();
    await request(app).get("/api/profile").expect(401);
    await request(app).get("/api/profile").set("Authorization", "Bearer invalid").expect(401);
  });

  it("prevents a non-member from creating a message", async () => {
    const { app, prisma } = harness();
    prisma.conversationMember.findUnique.mockResolvedValue(null);
    await request(app).post("/api/messages").set("Authorization", "Bearer valid").send({
      conversationId: "22222222-2222-4222-8222-222222222222",
      clientId: "client-123456",
      type: "TEXT",
      text: "Unauthorized"
    }).expect(403);
    expect(prisma.message.upsert).not.toHaveBeenCalled();
  });

  it("creates, edits, hides, and rejects delete-for-everyone by a different user", async () => {
    const { app, prisma } = harness();
    const authId = "11111111-1111-4111-8111-111111111111";
    const conversationId = "22222222-2222-4222-8222-222222222222";
    const messageId = "33333333-3333-4333-8333-333333333333";
    prisma.conversationMember.findUnique.mockResolvedValue({ userId: authId, conversationId });
    prisma.message.upsert.mockResolvedValue({
      id: messageId, senderId: authId, conversationId, clientId: "client-123456", type: "TEXT", text: "Hello", createdAt: new Date()
    });
    prisma.conversation.update.mockResolvedValue({});

    await request(app).post("/api/messages").set("Authorization", "Bearer valid").send({
      conversationId, clientId: "client-123456", type: "TEXT", text: "Hello"
    }).expect(201);

    prisma.message.findUnique.mockResolvedValue({ id: messageId, senderId: authId, conversationId, type: "TEXT" });
    prisma.message.update.mockResolvedValue({ id: messageId, senderId: authId, conversationId, type: "TEXT", text: "Updated" });
    await request(app).patch(`/api/messages/${messageId}`).set("Authorization", "Bearer valid").send({ text: "Updated" }).expect(200);
    await request(app).delete(`/api/messages/${messageId}/me`).set("Authorization", "Bearer valid").expect(204);
    expect(prisma.hiddenMessage.upsert).toHaveBeenCalled();

    prisma.message.findUnique.mockResolvedValue({ id: messageId, senderId: "44444444-4444-4444-8444-444444444444", conversationId });
    await request(app).delete(`/api/messages/${messageId}/everyone`).set("Authorization", "Bearer valid").expect(403);
  });
});
