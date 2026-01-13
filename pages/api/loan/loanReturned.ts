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

  // Get the loan
  const loan = await prisma.loan.findUnique({
    where: { id },
  });

  if (!loan) {
    res.status(404).json({ message: "Loan not found" });
    return;
  }

  // Find all boxes with their loans
  const boxes = await prisma.box.findMany({
    include: {
      loans: {
        where: {
          status: LoanStatus.IN_BOX,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (boxes.length === 0) {
    res.status(400).json({ message: "No boxes available" });
    return;
  }

  // Find the box with the fewest loans (or an empty box)
  const selectedBox = boxes.reduce((prev, current) =>
    current.loans.length < prev.loans.length ? current : prev
  );

  // Update loan status to IN_BOX and assign it to the selected box
  const result = await prisma.loan.update({
    where: { id },
    data: {
      status: LoanStatus.IN_BOX,
      boxId: selectedBox.id,
    },
  });

  res.status(200).json(result);
}
