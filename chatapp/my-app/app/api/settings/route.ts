// ============================================================================
// GET/PUT /api/settings - User preferences
// ============================================================================

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { updateSettingsSchema } from "@/src/lib/validation";

export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    let settings = await prisma.settings.findUnique({
      where: { userId: payload.userId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.settings.create({
        data: { userId: payload.userId },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("[Get Settings Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);
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

    const settings = await prisma.settings.upsert({
      where: { userId: payload.userId },
      update: validation.data,
      create: {
        userId: payload.userId,
        ...validation.data,
      },
    });

    return NextResponse.json({
      success: true,
      data: settings,
      message: "Settings updated",
    });
  } catch (error) {
    console.error("[Update Settings Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

