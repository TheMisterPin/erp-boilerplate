import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "../src/generated/prisma/client"
import { shouldSeed } from "./should-seed"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("DATABASE_URL is not set")
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

async function main(): Promise<void> {
  try {
    const count = await prisma.user.count()
    if (shouldSeed(count)) {
      process.stdout.write("seed\n")
    } else {
      process.stdout.write("skip\n")
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
