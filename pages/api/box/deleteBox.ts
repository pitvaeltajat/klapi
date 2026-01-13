import prisma from "../../../utils/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.group !== "ADMIN") {
    res.status(401).json({
      message: "Sinulla ei ole oikeutta tähän toimintoon",
    });
    return;
  }

  const { id } = req.body;

  if (!id) {
    res.status(400).json({ message: "Box ID is required" });
    return;
  }

  // Check if box has items
  const box = await prisma.box.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!box) {
    res.status(404).json({ message: "Box not found" });
    return;
  }

  if (box.items.length > 0) {
    res.status(400).json({
      message: "Cannot delete box with items. Remove items first.",
    });
    return;
  }

  await prisma.box.delete({
    where: { id },
  });

  res.status(200).json({ message: "Box deleted successfully" });
}
