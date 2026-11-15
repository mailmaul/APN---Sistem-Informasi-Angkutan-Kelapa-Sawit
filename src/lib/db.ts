import { PrismaClient } from "@prisma/client";

// Next dev hot-reloads modules; without the global cache every reload opens a
// new connection pool until SQLite starts refusing them.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
