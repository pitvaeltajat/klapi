import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function createKioskUser() {
  console.log("Creating kiosk user...");

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { username: "pitva" },
  });

  if (existingUser) {
    console.log("Kiosk user already exists. Updating password...");
    const hashedPassword = await bcrypt.hash("pitva", 10);
    const updatedUser = await prisma.user.update({
      where: { username: "pitva" },
      data: {
        password: hashedPassword,
        group: "KIOSK",
      },
    });
    console.log(`Updated kiosk user with username ${updatedUser.username} and id: ${updatedUser.id}`);
  } else {
    const hashedPassword = await bcrypt.hash("pitva", 10);
    const kioskUser = await prisma.user.create({
      data: {
        username: "pitva",
        password: hashedPassword,
        name: "Kiosk User",
        group: "KIOSK",
      },
    });
    console.log(`Created kiosk user with username ${kioskUser.username} and id: ${kioskUser.id}`);
  }
}

createKioskUser()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
