import { LoanStatus } from "@prisma/client";
import prisma from "../../../utils/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.group !== "ADMIN" && session?.user?.group !== "KIOSK") {
    res.status(401).json({
      message: "Sinulla ei ole oikeutta tähän toimintoon",
    });
    return;
  }

  const { id } = req.body;

  // Get the loan with its reservations and items
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      reservations: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!loan) {
    res.status(404).json({ message: "Loan not found" });
    return;
  }

  // Get all item IDs in this loan
  const loanItemIds = loan.reservations.map((r) => r.itemId);

  // Find all boxes with their items
  const boxes = await prisma.box.findMany({
    include: {
      items: {
        select: {
          id: true,
        },
      },
    },
  });

  if (boxes.length === 0) {
    res.status(400).json({ message: "No boxes available to store items" });
    return;
  }

  // Find a box that doesn't contain any of the loan's items
  let selectedBox = boxes.find((box) => {
    const boxItemIds = box.items.map((item) => item.id);
    // Check if no loan items exist in this box
    return !loanItemIds.some((loanItemId) => boxItemIds.includes(loanItemId));
  });

  // If no suitable box found, randomly select any box
  if (!selectedBox) {
    selectedBox = boxes[Math.floor(Math.random() * boxes.length)];
  }

  // Update loan status to IN_BOX and assign all items to the selected box
  const result = await prisma.$transaction(async (tx) => {
    // Assign all items in this loan to the selected box
    await tx.item.updateMany({
      where: {
        id: { in: loanItemIds },
      },
      data: {
        boxId: selectedBox.id,
      },
    });

    // Update loan status to IN_BOX
    return await tx.loan.update({
      where: { id },
      data: {
        status: LoanStatus.IN_BOX,
      },
    });
  });

  res.status(200).json(result);
}
