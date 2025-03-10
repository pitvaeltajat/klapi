import { sendEmail } from "./ses-client";
import prisma from "../../../utils/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import "dotenv/config";

async function sendNewLoanEmail(loanCreator: string, id: string) {
  const adminEmails = (
    await prisma.user.findMany({
      where: { group: "ADMIN" },
      select: { email: true },
    })
  )
    .map((user) => user.email)
    .filter((email): email is string => email !== null);

  const html = `
    <h1>Uusi varaushakemus vastaanotettu.</h1>
    <p>
      Varaushakemus on vastaanotettu ja odottaa hyväksyntää.<br />
      Voit tarkastella hakemuksen tietoja ja hyväksyä hakemuksen osoitteessa ${process.env.NEXT_PUBLIC_VERCEL_URL}/loan/${id}.
    </p>
    `;

  const subject = `Uusi varaushakemus henkilöltä ${loanCreator}`;
  await sendEmail(adminEmails, subject, html);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { loanCreator, id } = req.body;
  try {
    await sendNewLoanEmail(loanCreator, id);
    res.status(200).json({ message: "Email sent" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Unknown error" });
    }
  }
}
