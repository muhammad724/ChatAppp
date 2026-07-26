import { z } from "zod";

export const uuid = z.uuid();
export const profileSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/),
  displayName: z.string().trim().min(1).max(60),
  avatarUrl: z.url().nullable().optional()
});
export const conversationSchema = z.object({ userId: uuid });
export const messageSchema = z.discriminatedUnion("type", [
  z.object({
    conversationId: uuid,
    clientId: z.string().min(8).max(64),
    type: z.literal("TEXT"),
    text: z.string().trim().min(1).max(4000)
  }),
  z.object({
    conversationId: uuid,
    clientId: z.string().min(8).max(64),
    type: z.literal("IMAGE"),
    imageUrl: z.url().refine((url) => url.includes("res.cloudinary.com")),
    cloudinaryPublicId: z.string().regex(/^greenline\/[a-zA-Z0-9_-]+$/)
  })
]);
export const editSchema = z.object({ text: z.string().trim().min(1).max(4000) });
export const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(120),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  bytes: z.number().int().positive()
});

export function pairKey(a: string, b: string) {
  return [a, b].sort().join(":");
}
