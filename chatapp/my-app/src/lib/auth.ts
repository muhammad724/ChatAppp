// ============================================================================
// Authentication Utilities - JWT, Cookies, Password Hashing
// ============================================================================

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { AuthPayload } from "@/src/types";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-in-production";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn("WARNING: JWT_SECRET environment variable is not set. Using insecure default for development.");
}

const JWT_EXPIRES_IN = "7d";
const COOKIE_NAME = "auth_token";

// ─── Password Hashing ───────────────────────────────────────────────────────

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ─── JWT Token Management ───────────────────────────────────────────────────

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

// ─── Cookie Management ──────────────────────────────────────────────────────

/**
 * Set the authentication cookie in the response
 */
export function setAuthCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

/**
 * Clear the authentication cookie
 */
export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

/**
 * Get the current authenticated user's payload from the cookie
 */
export async function getAuthPayload(): Promise<AuthPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Authenticate API requests from either the website cookie or an extension
 * Authorization header. Bearer tokens are useful for clients that cannot
 * access the website's HttpOnly cookie, such as a Chrome extension.
 */
export async function getAuthPayloadFromRequest(
  request: Request
): Promise<AuthPayload | null> {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return verifyToken(authorization.slice(7).trim());
  }

  return getAuthPayload();
}

/**
 * Get the authentication cookie name
 */
export function getCookieName(): string {
  return COOKIE_NAME;
}

