import { sendEmail } from "./ses-client";
import type { NextApiRequest, NextApiResponse } from "next";
async function sendApproveEmail(recipientEmail: string, id: string) {
  const html = `
    <h1>Varaushakemuksesi tunnuksella ${id} on hyväksytty.</h1>
    <p>
        Voit tarkastella hakemuksen tietoja osoitteessa ${process.env.NEXT_PUBLIC_VERCEL_URL}/loan/${id}.<br />
        Muista noutaa varaus ilmoittamaasi aikaan.<br /><br />

        <i>Tämä on automaattinen viesti. Älä vastaa tähän viestiin.</i>
    </p>
    `;

  const subject = `Varaushakemuksesi on hyväksytty`;
  await sendEmail([recipientEmail], subject, html);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email, id } = req.body;
  try {
    await sendApproveEmail(email, id);
    res.status(200).json({ message: "Email sent" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Unknown error" });
    }
  }
}
