import { sendEmail } from "./ses-client";
import type { NextApiRequest, NextApiResponse } from "next";

interface LoanInfo {
  id: string;
  userName: string;
  startTime: string;
  boxName?: string;
}

async function sendAdminReminderEmail(
  recipientEmail: string,
  loans: LoanInfo[]
) {
  const loansList = loans
    .map(
      (loan) =>
        `<li>Varaus ${loan.id} - ${loan.userName} - Boksissa: ${
          loan.boxName || "Tuntematon"
        } - Aloitettu: ${loan.startTime}</li>`
    )
    .join("");

  const html = `
    <h1>Viikottainen muistutus: Varauksia odottaa palautusta</h1>
    <p>
      Seuraavat varaukset ovat olleet bokseissa yli viikon:<br /><br />

      <ul>
        ${loansList}
      </ul>
      <br />

      Voit tarkastella varauksia admin-paneelista osoitteessa ${process.env.NEXT_PUBLIC_VERCEL_URL}/admin.<br /><br />

    </p>
    `;

  const subject = `Viikottainen muistutus: ${loans.length} varausta odottaa palautusta`;
  await sendEmail([recipientEmail], subject, html);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email, loans } = req.body;

  if (!loans || !Array.isArray(loans) || loans.length === 0) {
    return res.status(400).json({ message: "No loans provided" });
  }

  try {
    await sendAdminReminderEmail(email, loans);
    res.status(200).json({ message: "Admin reminder email sent" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Unknown error" });
    }
  }
}
