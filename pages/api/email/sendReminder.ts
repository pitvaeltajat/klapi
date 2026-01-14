import { sendEmail } from "./ses-client";
import type { NextApiRequest, NextApiResponse } from "next";

async function sendReminderEmail(
  recipientEmail: string,
  id: string,
  endTime: string
) {
  const html = `
    <h1>Muistutus: Varauksesi päättyy pian</h1>
    <p>
      Varauksesi tunnuksella ${id} päättyy ${endTime}.<br /><br />

      Muistathan palauttaa varaamasi tavarat ajoissa.<br /><br />

      Voit tarkastella hakemuksen tietoja osoitteessa ${process.env.NEXT_PUBLIC_VERCEL_URL}/loan/${id}.<br /><br />

      <i>Tämä on automaattinen viesti. Älä vastaa tähän viestiin.</i>
    </p>
    `;

  const subject = `Muistutus: Varauksesi ${id} päättyy pian`;
  await sendEmail([recipientEmail], subject, html);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email, id, endTime } = req.body;
  try {
    await sendReminderEmail(email, id, endTime);
    res.status(200).json({ message: "Reminder email sent" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Unknown error" });
    }
  }
}
