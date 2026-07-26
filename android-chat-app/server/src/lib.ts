import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import type { Config } from "./config.js";

export const prisma = new PrismaClient();

export function createServices(config: Config) {
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true
  });
  return { prisma, supabase, cloudinary };
}

export type Services = ReturnType<typeof createServices>;
