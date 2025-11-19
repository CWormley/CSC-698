import { PrismaClient } from './generated/prisma/index.js';
const prisma = new PrismaClient();

async function fixRole() {
  try {
    // Check if role column exists
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Message' AND column_name = 'role'
      );
    `;
    
    const roleExists = result[0].exists;
    console.log("Role column exists:", roleExists);
    
    if (!roleExists) {
      console.log("Adding role column to Message table...");
      await prisma.$executeRaw`
        ALTER TABLE "Message" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
      `;
      console.log("Role column added successfully!");
    } else {
      console.log("Role column already exists. Checking message contents...");
      const msg = await prisma.message.findFirst();
      if (msg) {
        console.log("Sample message:", JSON.stringify(msg, null, 2));
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixRole();
