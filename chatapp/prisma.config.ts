// @ts-nocheck - Prisma CLI config file, not compiled by Next.js/TypeScript
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(projectRoot, ".env"), override: false });

// Schema operations need the session-mode pooler; the app itself uses DATABASE_URL.
const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "❌ Missing DATABASE_URL environment variable. Please check your .env file."
  );
}

export default defineConfig({
  schema: resolve(projectRoot, "prisma/schema.prisma"),

  migrations: {
    path: resolve(projectRoot, "prisma/migrations"),
  },

  datasource: {
    url: DATABASE_URL,
  },
});
