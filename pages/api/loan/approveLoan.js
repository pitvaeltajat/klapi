import { LoanStatus } from "@prisma/client";
import prisma from "/utils/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.group !== "ADMIN") {
    res.status(401).json({
      message: "Sinulla ei ole oikeutta tähän toimintoon",
    });
    return;
  }

  const { id } = req.body;
  await prisma.loan.findMany({
    where: { id: id },
    include: {
      user: true,
      reservations: {
        include: {
          item: true,
        },
      },
    },
  });

  const result = await prisma.Loan.update({
    where: { id: id },
    data: {
      status: LoanStatus.ACCEPTED,
    },
  });
  res.status(200).json(result);
}
