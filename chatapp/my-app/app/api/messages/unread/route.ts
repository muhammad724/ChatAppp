import prisma from "@/src/lib/prisma";
import { getAuthPayloadFromRequest } from "@/src/lib/auth";
import { corsJson, corsOptions } from "@/src/lib/cors";

export async function GET(request: Request) {
  const payload = await getAuthPayloadFromRequest(request);
  if (!payload) {
    return corsJson(request, { success: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const sinceValue = url.searchParams.get("since");
    const since = sinceValue ? new Date(sinceValue) : null;
    const validSince = since && !Number.isNaN(since.getTime()) ? since : null;
    const baseWhere = {
      conversation: { participants: { some: { userId: payload.userId } } },
      senderId: { not: payload.userId },
      isSeen: false,
      isDeleted: false,
    };

    const [count, messages] = await Promise.all([
      prisma.message.count({ where: baseWhere }),
      prisma.message.findMany({
        where: { ...baseWhere, ...(validSince ? { createdAt: { gt: validSince } } : {}) },
        orderBy: { createdAt: "asc" },
        take: 20,
        include: {
          sender: { select: { id: true, username: true, avatar: true } },
        },
      }),
    ]);

    return corsJson(request, {
      success: true,
      data: { count, messages, checkedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error("[Unread Messages Error]:", error);
    return corsJson(request, { success: false, error: "Failed to fetch unread messages" }, { status: 500 });
  }
}

export function OPTIONS(request: Request) {
  return corsOptions(request);
}
