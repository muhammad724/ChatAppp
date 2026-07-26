import { Router } from "express";
import { z } from "zod";
import type { Services } from "./lib.js";
import type { Server } from "socket.io";
import { HttpError } from "./errors.js";
import { requireMember } from "./auth.js";
import {
  conversationSchema, editSchema, messageSchema, pairKey, profileSchema, uploadSchema, uuid
} from "./validation.js";
import type { Config } from "./config.js";

const pageSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30)
});

export function createRoutes(services: Services, config: Config, io: Server) {
  const router = Router();

  router.get("/health", (_req, res) => res.json({ ok: true }));

  router.put("/profile", async (req, res) => {
    const userId = req.authUserId!;
    const data = profileSchema.parse(req.body);
    const profileData = {
      username: data.username,
      displayName: data.displayName,
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {})
    };
    const profile = await services.prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, ...profileData },
      update: profileData
    }).catch((error: { code?: string }) => {
      if (error.code === "P2002") throw new HttpError(409, "Username is already taken", "USERNAME_TAKEN");
      throw error;
    });
    res.json(profile);
  });

  router.get("/profile", async (req, res) => {
    const profile = await services.prisma.user.findUnique({ where: { id: req.authUserId! } });
    if (!profile) throw new HttpError(404, "Complete your profile", "PROFILE_REQUIRED");
    res.json(profile);
  });

  router.get("/users/search", async (req, res) => {
    const q = z.string().trim().toLowerCase().max(30).parse(req.query.q ?? "");
    if (q.length < 2) return res.json([]);
    const users = await services.prisma.user.findMany({
      where: { username: { startsWith: q, mode: "insensitive" }, id: { not: req.authUserId! } },
      select: { id: true, username: true, displayName: true, avatarUrl: true, lastSeenAt: true },
      take: 20,
      orderBy: { username: "asc" }
    });
    res.json(users);
  });

  router.get("/users", async (req, res) => {
    const users = await services.prisma.user.findMany({
      where: { id: { not: req.authUserId! } },
      select: { id: true, username: true, displayName: true, avatarUrl: true, lastSeenAt: true },
      take: 100,
      orderBy: [{ displayName: "asc" }, { username: "asc" }]
    });
    res.json(users);
  });

  router.post("/conversations", async (req, res) => {
    const userId = req.authUserId!;
    const { userId: otherId } = conversationSchema.parse(req.body);
    if (otherId === userId) throw new HttpError(400, "Cannot chat with yourself");
    const other = await services.prisma.user.findUnique({ where: { id: otherId } });
    if (!other) throw new HttpError(404, "User not found");
    const key = pairKey(userId, otherId);
    const conversation = await services.prisma.conversation.upsert({
      where: { pairKey: key },
      create: {
        pairKey: key,
        members: { create: [{ userId }, { userId: otherId }] }
      },
      update: {},
      include: { members: { include: { user: true } } }
    });
    res.status(201).json(conversation);
  });

  router.get("/conversations", async (req, res) => {
    const userId = req.authUserId!;
    const conversations = await services.prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      include: {
        members: { where: { userId: { not: userId } }, select: { user: true } },
        messages: {
          where: { hiddenFor: { none: { userId } } },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
    const rows = await Promise.all(conversations.map(async (conversation) => {
      const membership = await services.prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: conversation.id, userId } }
      });
      const unread = await services.prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          createdAt: { gt: membership?.lastReadAt ?? new Date(0) },
          deletedForEveryoneAt: null,
          hiddenFor: { none: { userId } }
        }
      });
      return { ...conversation, unreadCount: unread };
    }));
    res.json(rows);
  });

  router.get("/conversations/:id/messages", async (req, res) => {
    const conversationId = uuid.parse(req.params.id);
    const userId = req.authUserId!;
    await requireMember(services, conversationId, userId);
    const { cursor, limit } = pageSchema.parse(req.query);
    const messages = await services.prisma.message.findMany({
      where: { conversationId, hiddenFor: { none: { userId } } },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
    });
    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    res.json({ items, nextCursor: hasMore ? items.at(-1)?.id : null });
  });

  router.post("/messages", async (req, res) => {
    const data = messageSchema.parse(req.body);
    const userId = req.authUserId!;
    await requireMember(services, data.conversationId, userId);
    const message = await services.prisma.$transaction(async (tx) => {
      const created = await tx.message.upsert({
        where: { senderId_clientId: { senderId: userId, clientId: data.clientId } },
        update: {},
        create: { ...data, senderId: userId }
      });
      await tx.conversation.update({
        where: { id: data.conversationId },
        data: { lastMessageAt: created.createdAt }
      });
      return created;
    });
    io.to(`conversation:${data.conversationId}`).emit("message:new", message);
    res.status(201).json(message);
  });

  router.patch("/messages/:id", async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { text } = editSchema.parse(req.body);
    const current = await services.prisma.message.findUnique({ where: { id } });
    if (!current) throw new HttpError(404, "Message not found");
    if (current.senderId !== req.authUserId) throw new HttpError(403, "Only the sender can edit this message");
    if (current.type !== "TEXT" || current.deletedForEveryoneAt) throw new HttpError(400, "Message cannot be edited");
    const message = await services.prisma.message.update({ where: { id }, data: { text, editedAt: new Date() } });
    io.to(`conversation:${current.conversationId}`).emit("message:updated", message);
    res.json(message);
  });

  router.delete("/messages/:id/me", async (req, res) => {
    const id = uuid.parse(req.params.id);
    const message = await services.prisma.message.findUnique({ where: { id } });
    if (!message) throw new HttpError(404, "Message not found");
    await requireMember(services, message.conversationId, req.authUserId!);
    await services.prisma.hiddenMessage.upsert({
      where: { messageId_userId: { messageId: id, userId: req.authUserId! } },
      create: { messageId: id, userId: req.authUserId! },
      update: {}
    });
    res.status(204).end();
  });

  router.delete("/messages/:id/everyone", async (req, res) => {
    const id = uuid.parse(req.params.id);
    const message = await services.prisma.message.findUnique({ where: { id } });
    if (!message) throw new HttpError(404, "Message not found");
    if (message.senderId !== req.authUserId) throw new HttpError(403, "Only the sender can delete this message");
    if (message.cloudinaryPublicId) {
      await services.cloudinary.uploader.destroy(message.cloudinaryPublicId, { resource_type: "image" });
    }
    const updated = await services.prisma.message.update({
      where: { id },
      data: { text: null, imageUrl: null, cloudinaryPublicId: null, deletedForEveryoneAt: new Date() }
    });
    io.to(`conversation:${message.conversationId}`).emit("message:deleted", { id, deletedForEveryoneAt: updated.deletedForEveryoneAt });
    res.status(204).end();
  });

  router.post("/uploads/sign", async (req, res) => {
    const data = uploadSchema.parse(req.body);
    if (data.bytes > config.MAX_IMAGE_BYTES) throw new HttpError(413, "Image is too large", "IMAGE_TOO_LARGE");
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `greenline/${req.authUserId}-${crypto.randomUUID()}`;
    const signature = services.cloudinary.utils.api_sign_request(
      { timestamp, public_id: publicId },
      config.CLOUDINARY_API_SECRET
    );
    res.json({
      cloudName: config.CLOUDINARY_CLOUD_NAME,
      apiKey: config.CLOUDINARY_API_KEY,
      timestamp,
      publicId,
      signature,
      maxBytes: config.MAX_IMAGE_BYTES,
      allowedTypes: ["image/jpeg", "image/png", "image/webp"]
    });
  });

  router.post("/conversations/:id/read", async (req, res) => {
    const conversationId = uuid.parse(req.params.id);
    const userId = req.authUserId!;
    await requireMember(services, conversationId, userId);
    const now = new Date();
    await services.prisma.$transaction([
      services.prisma.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: now }
      }),
      services.prisma.message.updateMany({
        where: { conversationId, senderId: { not: userId }, status: { not: "READ" } },
        data: { status: "READ" }
      })
    ]);
    io.to(`conversation:${conversationId}`).emit("messages:read", { conversationId, userId, at: now });
    res.status(204).end();
  });

  return router;
}
