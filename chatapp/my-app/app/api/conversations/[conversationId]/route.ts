// ============================================================================
// GET/PUT/DELETE /api/conversations/[conversationId]
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { updateGroupSchema } from "@/src/lib/validation";

// GET - Get conversation details with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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
          orderBy: { createdAt: "asc" },
          take: 50,
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
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.userId === payload.userId
    );
    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("[Get Conversation Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// PUT - Update group (rename)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { conversationId } = await params;
    const body = await request.json();

    // Verify user is admin of the group
    const participant = await prisma.participant.findUnique({
      where: {
        userId_conversationId: {
          userId: payload.userId,
          conversationId,
        },
      },
    });

    if (!participant || participant.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only group admins can update the group" },
        { status: 403 }
      );
    }

    const validation = updateGroupSchema.safeParse(body);
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

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { name: validation.data.name },
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

    return NextResponse.json({
      success: true,
      data: conversation,
      message: "Group updated successfully",
    });
  } catch (error) {
    console.error("[Update Group Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update group" },
      { status: 500 }
    );
  }
}

// DELETE - Leave group or delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    const participant = await prisma.participant.findUnique({
      where: {
        userId_conversationId: {
          userId: payload.userId,
          conversationId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: "You are not a participant" },
        { status: 404 }
      );
    }

    // Remove participant (leave group)
    await prisma.participant.delete({
      where: {
        userId_conversationId: {
          userId: payload.userId,
          conversationId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Left conversation successfully",
    });
  } catch (error) {
    console.error("[Leave Group Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to leave group" },
      { status: 500 }
    );
  }
}

