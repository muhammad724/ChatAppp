// ============================================================================
// GET /api/messages - List messages for a conversation
// POST /api/messages - Send a message (REST fallback)
// ============================================================================

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { sendMessageSchema } from "@/src/lib/validation";

export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const isParticipant = await prisma.participant.findUnique({
      where: {
        userId_conversationId: {
          userId: payload.userId,
          conversationId,
        },
      },
    });

    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
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

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;

    // Mark messages as delivered
    const undeliveredIds = data
      .filter((msg) => !msg.isDelivered && msg.senderId !== payload.userId)
      .map((msg) => msg.id);

    if (undeliveredIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: undeliveredIds } },
        data: { isDelivered: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: data.reverse(),
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id : null,
    });
  } catch (error) {
    console.error("[Get Messages Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { conversationId, content, type } = body;

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "conversationId is required" },
        { status: 400 }
      );
    }

    const validation = sendMessageSchema.safeParse({ content, type });
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const isParticipant = await prisma.participant.findUnique({
      where: {
        userId_conversationId: {
          userId: payload.userId,
          conversationId,
        },
      },
    });

    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: payload.userId,
        content: validation.data.content,
        type: validation.data.type,
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

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(
      {
        success: true,
        data: message,
        message: "Message sent",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Send Message Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}

