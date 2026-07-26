// ============================================================================
// GET /api/conversations - List user conversations
// POST /api/conversations - Create a new conversation or group
// ============================================================================

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { createGroupSchema } from "@/src/lib/validation";

export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Avoid Prisma issuing relation queries with `IN (NULL)` when this user
    // has no conversations. This keeps the empty state to one database trip.
    const firstConversation = await prisma.conversation.findFirst({
      where: {
        participants: {
          some: { userId: payload.userId },
        },
      },
      select: { id: true },
    });

    if (!firstConversation) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: payload.userId },
        },
      },
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
      orderBy: { updatedAt: "desc" },
    });

    // Transform data to include lastMessage and unreadCount
    const conversationList = conversations.map((conv) => ({
      id: conv.id,
      type: conv.type,
      name: conv.name,
      avatar: conv.avatar,
      participants: conv.participants,
      lastMessage: conv.messages[0] || null,
      unreadCount: 0, // TODO: Implement unread count tracking
      updatedAt: conv.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: conversationList,
    });
  } catch (error) {
    console.error("[Conversations List Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversations" },
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

    // If it's a one-to-one chat
    if (body.type === "one_to_one") {
      const { recipientId } = body;

      if (!recipientId) {
        return NextResponse.json(
          { success: false, error: "Recipient ID is required" },
          { status: 400 }
        );
      }

      // Optimized: First get user's conversation IDs, then check if recipient shares one
      const userConversationIds = (
        await prisma.participant.findMany({
          where: { userId: payload.userId },
          select: { conversationId: true },
        })
      ).map((p) => p.conversationId);

      let existingConversation = null;

      if (userConversationIds.length > 0) {
        const sharedParticipant = await prisma.participant.findFirst({
          where: {
            userId: recipientId,
            conversationId: { in: userConversationIds },
            conversation: { type: "one_to_one" },
          },
          select: { conversationId: true },
        });

        if (sharedParticipant) {
          existingConversation = await prisma.conversation.findUnique({
            where: { id: sharedParticipant.conversationId },
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
            },
          });
        }
      }

      if (existingConversation) {
        return NextResponse.json({
          success: true,
          data: existingConversation,
          message: "Conversation already exists",
        });
      }

      // Create new one-to-one conversation in a single transaction
      const conversation = await prisma.$transaction(async (tx) => {
        const conv = await tx.conversation.create({
          data: {
            type: "one_to_one",
          },
        });

        await tx.participant.createMany({
          data: [
            { userId: payload.userId, conversationId: conv.id, role: "member" },
            { userId: recipientId, conversationId: conv.id, role: "member" },
          ],
        });

        return tx.conversation.findUnique({
          where: { id: conv.id },
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
          },
        });
      });

      return NextResponse.json(
        {
          success: true,
          data: conversation,
          message: "Conversation created",
        },
        { status: 201 }
      );
    }

    // If it's a group chat
    if (body.type === "group") {
      const validation = createGroupSchema.safeParse(body);
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

      const { name, memberIds } = validation.data;

      // Ensure creator is included in members
      const allMemberIds = [...new Set([...memberIds, payload.userId])];

      const conversation = await prisma.conversation.create({
        data: {
          type: "group",
          name,
          participants: {
            createMany: {
              data: allMemberIds.map((userId) => ({
                userId,
                role: userId === payload.userId ? "admin" : "member",
              })),
            },
          },
        },
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
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: conversation,
          message: "Group created successfully",
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid conversation type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Create Conversation Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

