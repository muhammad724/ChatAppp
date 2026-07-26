// ============================================================================
// Socket.IO Server - Real-time Communication Engine
// ============================================================================

import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import { Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "@/src/types";
import { verifyToken } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

interface SocketData {
  userId: string;
  username: string;
}

export type IOServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
export type SocketType = Parameters<Parameters<IOServer["on"]>[1]>[0];

// Track online users: userId -> Set<socketId>
const onlineUsers = new Map<string, Set<string>>();
// Track which conversations each socket is in
const socketConversations = new Map<string, Set<string>>();

/**
 * Initialize Socket.IO server
 */
export function initSocketIO(httpServer: HTTPServer | NetSocket): IOServer {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>(httpServer as HTTPServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // ─── Authentication Middleware ───────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = verifyToken(token);
      if (!payload) {
        return next(new Error("Invalid or expired token"));
      }

      socket.data.userId = payload.userId;
      
      // Fetch username from database
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.data.username = user.username;
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  // ─── Connection Handler ─────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const username = socket.data.username;

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Initialize socket conversations tracking
    socketConversations.set(socket.id, new Set());

    // Notify others that user is online
    socket.broadcast.emit("user_online", { userId });

    console.log(`[Socket] ${username} connected (${socket.id})`);

    // ─── Join Conversation ────────────────────────────────────────────────
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(conversationId);
      socketConversations.get(socket.id)?.add(conversationId);
    });

    // ─── Leave Conversation ───────────────────────────────────────────────
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(conversationId);
      socketConversations.get(socket.id)?.delete(conversationId);
    });

    // ─── Send Message ─────────────────────────────────────────────────────
    socket.on("send_message", async (data) => {
      try {
        const { conversationId, content, type, attachments } = data;

        // Verify user is a participant
        const participant = await prisma.participant.findUnique({
          where: {
            userId_conversationId: {
              userId,
              conversationId,
            },
          },
        });

        if (!participant) {
          socket.emit("error", { message: "You are not a participant in this conversation" });
          return;
        }

        // Create message in database
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content,
            type,
            isDelivered: true,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                bio: true,
                createdAt: true,
              },
            },
            attachments: true,
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true,
                    bio: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        });

        // Create attachments if any
        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            await prisma.attachment.create({
              data: {
                messageId: message.id,
                url: att.url,
                type: att.type,
                name: att.name,
                size: att.size,
              },
            });
          }

          // Re-fetch with attachments
          const messageWithAttachments = await prisma.message.findUnique({
            where: { id: message.id },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatar: true,
                  bio: true,
                  createdAt: true,
                },
              },
              attachments: true,
              reactions: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      email: true,
                      avatar: true,
                      bio: true,
                      createdAt: true,
                    },
                  },
                },
              },
            },
          });

          // Broadcast to all in conversation including sender
          io.to(conversationId).emit("receive_message", messageWithAttachments!);
        } else {
          io.to(conversationId).emit("receive_message", message);
        }

        // Update conversation's updatedAt
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
      } catch (error) {
        console.error("[Socket] Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ─── Typing Indicator ──────────────────────────────────────────────────
    socket.on("typing", (conversationId: string) => {
      socket.to(conversationId).emit("typing", {
        conversationId,
        userId,
        username,
      });

      // Update typing status in database
      prisma.typingStatus
        .upsert({
          where: {
            userId_conversationId: {
              userId,
              conversationId,
            },
          },
          update: { isTyping: true },
          create: { userId, conversationId, isTyping: true },
        })
        .catch(console.error);
    });

    // ─── Stop Typing ───────────────────────────────────────────────────────
    socket.on("stop_typing", (conversationId: string) => {
      socket.to(conversationId).emit("stop_typing", {
        conversationId,
        userId,
      });

      prisma.typingStatus
        .upsert({
          where: {
            userId_conversationId: {
              userId,
              conversationId,
            },
          },
          update: { isTyping: false },
          create: { userId, conversationId, isTyping: false },
        })
        .catch(console.error);
    });

    // ─── Message Seen ──────────────────────────────────────────────────────
    socket.on("message_seen", async ({ messageId, conversationId }) => {
      try {
        await prisma.message.update({
          where: { id: messageId },
          data: { isSeen: true },
        });

        io.to(conversationId).emit("message_seen", {
          messageId,
          conversationId,
          userId,
        });
      } catch (error) {
        console.error("[Socket] Error marking message as seen:", error);
      }
    });

    // ─── Message Delivered ─────────────────────────────────────────────────
    socket.on("message_delivered", async ({ messageId, conversationId }) => {
      try {
        await prisma.message.update({
          where: { id: messageId },
          data: { isDelivered: true },
        });

        io.to(conversationId).emit("message_delivered", {
          messageId,
          conversationId,
        });
      } catch (error) {
        console.error("[Socket] Error marking message as delivered:", error);
      }
    });

    // ─── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      // Remove socket from online tracking
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Notify others that user went offline
          io.emit("user_offline", { userId });
        }
      }

      // Clean up conversation tracking
      socketConversations.delete(socket.id);

      // Clear typing status
      prisma.typingStatus
        .deleteMany({ where: { userId } })
        .catch(console.error);

      console.log(`[Socket] ${username} disconnected (${socket.id})`);
    });
  });

  return io;
}

/**
 * Get online user IDs
 */
export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}

/**
 * Check if a user is online
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && (onlineUsers.get(userId)?.size ?? 0) > 0;
}

