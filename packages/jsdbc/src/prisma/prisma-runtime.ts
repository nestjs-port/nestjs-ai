import type { PrismaRuntime } from "./prisma";

const { Prisma } = require("@prisma/client") as {
  Prisma: PrismaRuntime;
};

export { Prisma };
