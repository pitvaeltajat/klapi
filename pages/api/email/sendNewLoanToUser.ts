import { sendEmail } from "./ses-client";
import type { NextApiRequest, NextApiResponse } from "next";

async function sendCreatedEmail(recipientEmail: string, id: string) {
  const html = `
    <h1>Uusi varaushakemus luotu</h1>
    <p>
      Varaushakemuksesi on luotu onnistuneesti.<br /><br />

      Varaustunnus: ${id}<br /><br />
      
      Voit tarkastella hakemuksen tietoja osoitteessa ${process.env.NEXT_PUBLIC_VERCEL_URL}/loan/${id}.<br /><br />
      
      Saat sähköpostitse tiedon, kun hakemus on käsitelty.<br /><br />

      <i>Tämä on automaattinen viesti. Älä vastaa tähän viestiin.</i>
    </p>
    `;

  const subject = `Varaushakemus ${id} luotu`;
  await sendEmail([recipientEmail], subject, html);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email, id } = req.body;
  try {
    await sendCreatedEmail(email, id);
    res.status(200).json({ message: "Email sent" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Unknown error" });
    }
  }
}
