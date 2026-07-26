// ============================================================================
// GET /api/search - Search users, conversations, and messages
// ============================================================================

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

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
    const query = searchParams.get("q")?.trim();
    const type = searchParams.get("type") || "all"; // users, conversations, messages, all

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 }
      );
    }

    const results: {
      users?: unknown[];
      conversations?: unknown[];
      messages?: unknown[];
    } = {};

    // Search users
    if (type === "users" || type === "all") {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
          NOT: { id: payload.userId },
        },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          bio: true,
          createdAt: true,
        },
        take: 10,
      });
      results.users = users;
    }

    // Search conversations
    if (type === "conversations" || type === "all") {
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: { some: { userId: payload.userId } },
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            {
              participants: {
                some: {
                  user: {
                    OR: [
                      { username: { contains: query, mode: "insensitive" } },
                      { email: { contains: query, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
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
          },
        },
        take: 10,
      });
      results.conversations = conversations;
    }

    // Search messages
    if (type === "messages" || type === "all") {
      const messages = await prisma.message.findMany({
        where: {
          conversation: {
            participants: { some: { userId: payload.userId } },
          },
          content: { contains: query, mode: "insensitive" },
          isDeleted: false,
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
          conversation: {
            select: {
              id: true,
              type: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      results.messages = messages;
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("[Search Error]:", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    );
  }
}

