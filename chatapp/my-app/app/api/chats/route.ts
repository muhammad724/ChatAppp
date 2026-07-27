import prisma from "@/src/lib/prisma";
import { getAuthPayloadFromRequest } from "@/src/lib/auth";
import { corsJson, corsOptions } from "@/src/lib/cors";

export async function GET(request: Request) {
  const payload = await getAuthPayloadFromRequest(request);
  if (!payload) {
    return corsJson(request, { success: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId: payload.userId } } },
      include: {
        participants: {
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
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const unreadGroups = await prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversation: { participants: { some: { userId: payload.userId } } },
        senderId: { not: payload.userId },
        isSeen: false,
        isDeleted: false,
      },
      _count: { _all: true },
    });
    const unreadByConversation = new Map(
      unreadGroups.map((entry) => [entry.conversationId, entry._count._all])
    );

    return corsJson(request, {
      success: true,
      data: conversations.map((conversation) => ({
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        avatar: conversation.avatar,
        participants: conversation.participants,
        lastMessage: conversation.messages[0] ?? null,
        unreadCount: unreadByConversation.get(conversation.id) ?? 0,
        updatedAt: conversation.updatedAt,
      })),
      currentUserId: payload.userId,
    });
  } catch (error) {
    console.error("[Extension Chats Error]:", error);
    return corsJson(request, { success: false, error: "Failed to fetch chats" }, { status: 500 });
  }
}

export function OPTIONS(request: Request) {
  return corsOptions(request);
}
