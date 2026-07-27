import prisma from "@/src/lib/prisma";
import { getAuthPayloadFromRequest } from "@/src/lib/auth";
import { corsJson, corsOptions } from "@/src/lib/cors";

export async function PATCH(request: Request) {
  const payload = await getAuthPayloadFromRequest(request);
  if (!payload) {
    return corsJson(request, { success: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId : null;
    const messageIds = Array.isArray(body.messageIds)
      ? body.messageIds.filter((id: unknown): id is string => typeof id === "string")
      : [];

    if (!conversationId && messageIds.length === 0) {
      return corsJson(
        request,
        { success: false, error: "conversationId or messageIds is required" },
        { status: 400 }
      );
    }

    if (conversationId) {
      const participant = await prisma.participant.findUnique({
        where: {
          userId_conversationId: { userId: payload.userId, conversationId },
        },
        select: { id: true },
      });
      if (!participant) {
        return corsJson(request, { success: false, error: "Access denied" }, { status: 403 });
      }
    }

    const result = await prisma.message.updateMany({
      where: {
        ...(conversationId ? { conversationId } : { id: { in: messageIds } }),
        senderId: { not: payload.userId },
        conversation: { participants: { some: { userId: payload.userId } } },
      },
      data: { isSeen: true, isDelivered: true },
    });

    return corsJson(request, { success: true, data: { updated: result.count } });
  } catch (error) {
    console.error("[Mark Messages Read Error]:", error);
    return corsJson(request, { success: false, error: "Failed to mark messages as read" }, { status: 500 });
  }
}

export function OPTIONS(request: Request) {
  return corsOptions(request);
}
