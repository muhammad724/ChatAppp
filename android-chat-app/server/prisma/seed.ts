import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

console.log(
  "Seed intentionally creates no auth users. Register through Supabase Auth so profile UUIDs match auth.users."
);
await prisma.$disconnect();
