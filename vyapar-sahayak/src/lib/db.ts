import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const dbUrl = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");
const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
