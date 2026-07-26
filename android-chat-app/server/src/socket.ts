import type { Server } from "socket.io";
import { z } from "zod";
import type { Services } from "./lib.js";
import { requireMember } from "./auth.js";
import { uuid } from "./validation.js";

const roomPayload = z.object({ conversationId: uuid });
const typingPayload = roomPayload.extend({ isTyping: z.boolean() });
const online = new Map<string, number>();

export function configureSockets(io: Server, services: Services) {
  io.use(async (socket, next) => {
    try {
      const token = z.string().min(1).parse(socket.handshake.auth.token);
      const { data, error } = await services.supabase.auth.getUser(token);
      if (error || !data.user) return next(new Error("UNAUTHENTICATED"));
      socket.data.userId = data.user.id;
      next();
    } catch {
      next(new Error("UNAUTHENTICATED"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    online.set(userId, (online.get(userId) ?? 0) + 1);
    socket.join(`user:${userId}`);
    io.emit("presence:changed", { userId, online: true });

    socket.on("conversation:join", async (raw, acknowledge) => {
      try {
        const { conversationId } = roomPayload.parse(raw);
        await requireMember(services, conversationId, userId);
        await socket.join(`conversation:${conversationId}`);
        await services.prisma.message.updateMany({
          where: { conversationId, senderId: { not: userId }, status: "SENT" },
          data: { status: "DELIVERED" }
        });
        socket.to(`conversation:${conversationId}`).emit("messages:delivered", { conversationId, userId });
        acknowledge?.({ ok: true });
      } catch {
        acknowledge?.({ ok: false, error: "FORBIDDEN" });
      }
    });

    socket.on("typing:set", async (raw) => {
      try {
        const data = typingPayload.parse(raw);
        await requireMember(services, data.conversationId, userId);
        socket.to(`conversation:${data.conversationId}`).emit("typing:changed", { ...data, userId });
      } catch {
        // Invalid or unauthorized socket payloads are intentionally ignored.
      }
    });

    socket.on("disconnect", async () => {
      const count = (online.get(userId) ?? 1) - 1;
      if (count <= 0) {
        online.delete(userId);
        const at = new Date();
        await services.prisma.user.updateMany({ where: { id: userId }, data: { lastSeenAt: at } });
        io.emit("presence:changed", { userId, online: false, lastSeenAt: at });
      } else {
        online.set(userId, count);
      }
    });
  });
}
