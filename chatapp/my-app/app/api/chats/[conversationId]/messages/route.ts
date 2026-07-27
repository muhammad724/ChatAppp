import prisma from "@/src/lib/prisma";
import { getAuthPayloadFromRequest } from "@/src/lib/auth";
import { corsJson, corsOptions } from "@/src/lib/cors";
import { sendMessageSchema } from "@/src/lib/validation";

async function authorize(userId: string, conversationId: string) {
  return prisma.participant.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
    select: { id: true },
  });
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/chats/[conversationId]/messages">
) {
  const payload = await getAuthPayloadFromRequest(request);
  if (!payload) {
    return corsJson(request, { success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { conversationId } = await context.params;
  if (!(await authorize(payload.userId, conversationId))) {
    return corsJson(request, { success: false, error: "Access denied" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 40, 100);
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        sender: {
          select: { id: true, username: true, email: true, avatar: true },
        },
        attachments: true,
      },
    });

    return corsJson(request, {
      success: true,
      data: messages.reverse(),
      currentUserId: payload.userId,
    });
  } catch (error) {
    console.error("[Extension Chat Messages Error]:", error);
    return corsJson(request, { success: false, error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/chats/[conversationId]/messages">
) {
  const payload = await getAuthPayloadFromRequest(request);
  if (!payload) {
    return corsJson(request, { success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { conversationId } = await context.params;
  if (!(await authorize(payload.userId, conversationId))) {
    return corsJson(request, { success: false, error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = sendMessageSchema.safeParse({
      content: body.content,
      type: body.type ?? "text",
      attachments: body.attachments,
    });
    if (!validation.success) {
      return corsJson(
        request,
        { success: false, error: "Enter a valid message" },
        { status: 400 }
      );
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: payload.userId,
          content: validation.data.content,
          type: validation.data.type,
          isDelivered: true,
          ...(validation.data.attachments?.length
            ? { attachments: { create: validation.data.attachments } }
            : {}),
        },
        include: {
          sender: {
            select: { id: true, username: true, email: true, avatar: true },
          },
          attachments: true,
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      return created;
    });

    return corsJson(request, { success: true, data: message }, { status: 201 });
  } catch (error) {
    console.error("[Extension Send Message Error]:", error);
    return corsJson(request, { success: false, error: "Failed to send message" }, { status: 500 });
  }
}

export function OPTIONS(request: Request) {
  return corsOptions(request);
}
