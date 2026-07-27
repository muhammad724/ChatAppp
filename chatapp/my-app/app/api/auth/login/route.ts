// ============================================================================
// POST /api/auth/login - User Login
// ============================================================================

import { NextResponse } from "next/server";
import { verifyPassword, generateToken, setAuthCookie } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { loginSchema } from "@/src/lib/validation";
import { corsHeaders, corsOptions } from "@/src/lib/cors";

function withCors(request: Request, response: NextResponse) {
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    response.headers.set(key, value);
  }
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return withCors(request, NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      ));
    }

    const { email, password } = validation.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      return withCors(request, NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        { status: 401 }
      ));
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return withCors(request, NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        { status: 401 }
      ));
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email });

    const userProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
    };

    // Create response with auth cookie
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: userProfile,
          token,
        },
        message: "Logged in successfully",
      },
      { status: 200 }
    );

    response.headers.set("Set-Cookie", setAuthCookie(token));
    return withCors(request, response);
  } catch (error) {
    console.error("[Login Error]:", error);
    return withCors(request, NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    ));
  }
}

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

