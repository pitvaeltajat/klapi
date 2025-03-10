import prisma from "../../../utils/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import "dotenv/config";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { reservations, startTime, endTime, userId, description } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (!user) {
      res.status(404).json({ message: "Käyttäjää ei löytynyt" });
      return;
    }
    const result = await prisma.loan.create({
      data: {
        reservations: { create: reservations },
        startTime: startTime,
        endTime: endTime,
        user: { connect: { id: userId } },
        description,
      },
    });

    await fetch(
      `${process.env.NEXT_PUBLIC_VERCEL_URL}/api/email/sendNewLoanToUser`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: result.id,
          email: user.email,
        }),
      }
    );

    await fetch(
      `${process.env.NEXT_PUBLIC_VERCEL_URL}/api/email/sendNewLoanToAdmin`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: result.id,
          loanCreator: user.name,
        }),
      }
    );

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ message: err.message });
    } else {
      res.status(500).json({ message: "Unknown error" });
    }
    return;
  }
}
