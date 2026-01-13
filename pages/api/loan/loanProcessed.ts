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
  if (session?.user?.group !== "ADMIN") {
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

  // Update loan status to RETURNED and remove all items from their boxes
  const result = await prisma.$transaction(async (tx) => {
    // Remove all items in this loan from their boxes
    const itemIds = loan.reservations.map((r) => r.itemId);
    await tx.item.updateMany({
      where: {
        id: { in: itemIds },
      },
      data: {
        boxId: null,
      },
    });

    // Update loan status to RETURNED
    return await tx.loan.update({
      where: { id },
      data: {
        status: LoanStatus.RETURNED,
      },
    });
  });

  res.status(200).json(result);
}
