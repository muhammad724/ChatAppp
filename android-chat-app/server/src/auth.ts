import type { RequestHandler } from "express";
import type { Services } from "./lib.js";
import { HttpError } from "./errors.js";

export function authenticate(services: Services): RequestHandler {
  return async (req, _res, next) => {
    try {
      const value = req.headers.authorization;
      if (!value?.startsWith("Bearer ")) throw new HttpError(401, "Missing access token", "UNAUTHENTICATED");
      const { data, error } = await services.supabase.auth.getUser(value.slice(7));
      if (error || !data.user) throw new HttpError(401, "Invalid access token", "UNAUTHENTICATED");
      req.authUserId = data.user.id;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function requireMember(services: Services, conversationId: string, userId: string) {
  const member = await services.prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } }
  });
  if (!member) throw new HttpError(403, "You are not a member of this conversation", "FORBIDDEN");
  return member;
}
