// ============================================================================
// GET /api/auth/me - Get Current Authenticated User
// ============================================================================

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

export async function GET() {
  try {
    const payload = await getAuthPayload();

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
        settings: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Get Me Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

