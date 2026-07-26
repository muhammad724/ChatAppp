// ============================================================================
// POST /api/auth/logout - User Logout
// ============================================================================

import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/src/lib/auth";

export async function POST() {
  try {
    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      { status: 200 }
    );

    response.headers.set("Set-Cookie", clearAuthCookie());

    return response;
  } catch (error) {
    console.error("[Logout Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

