// ============================================================================
// POST /api/auth/register - User Registration
// ============================================================================

import { NextResponse } from "next/server";
import { hashPassword, generateToken, setAuthCookie } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { registerSchema } from "@/src/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
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

    const { username, email, password } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      return NextResponse.json(
        {
          success: false,
          error: `A user with this ${field} already exists`,
        },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email });

    // Create response with auth cookie
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user,
          token,
        },
        message: "Account created successfully",
      },
      { status: 201 }
    );

    response.headers.set("Set-Cookie", setAuthCookie(token));

    return response;
  } catch (error) {
    console.error("[Register Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}

