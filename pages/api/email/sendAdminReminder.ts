import { sendEmail } from './ses-client';
import prisma from '../../../utils/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getEmailStyles } from '../../../utils/emailHelpers';
import { getPublicUrl } from '../../../utils/urlHelpers';

interface LoanInfo {
  id: string;
  userName: string;
  startTime: string;
  boxName?: string;
}

async function sendAdminReminderEmail(recipientEmail: string, loans: LoanInfo[]) {
  const publicUrl = getPublicUrl();

  const loanItems = await Promise.all(
    loans.map(async (loan) => {
      const fullLoan = await prisma.loan.findUnique({
        where: { id: loan.id },
        include: {
          reservations: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  amount: true,
                },
              },
            },
          },
        },
      });
      return { loan, fullLoan };
    }),
  );

  const loansListHtml = loanItems
    .map(({ loan, fullLoan }) => {
      if (!fullLoan) return '';

      const itemsList = fullLoan.reservations
        .map((r) => `${r.item.name} (${r.amount} kpl)`)
        .join(', ');

      const loanUrl = `${publicUrl}/loan/${loan.id}`;
      
      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-bottom: 15px; background-color: #ffffff;">
          <h3 style="margin-top: 0; color: #1e40af;">
            <a href="${loanUrl}" style="color: #1e40af; text-decoration: none;">Varaus ${loan.id}</a>
          </h3>
          <div style="margin: 10px 0;">
            <strong>Varaaja:</strong> ${loan.userName}<br />
            <strong>Boksissa:</strong> ${loan.boxName || 'Tuntematon'}<br />
            <strong>Aloitettu:</strong> ${loan.startTime}<br />
            <strong>Tavarat:</strong> ${itemsList}
          </div>
          <a href="${loanUrl}" style="display: inline-block; padding: 8px 16px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Tarkastele varausta</a>
        </div>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <h1>📦 Viikottainen muistutus: Varauksia odottaa palautusta</h1>
        
        <p>Hei admin!</p>
        
        <p>Seuraavat <strong>${loans.length}</strong> varausta ovat olleet bokseissa yli viikon ja odottavat palautusta:</p>
        
        ${loansListHtml}
        
        <div class="info-box">
          <strong>⚠️ Toiminto vaaditaan:</strong> Ota yhteyttä varaajiin ja varmista, että tavarat palautetaan ajoissa.
        </div>
        
        <a href="${publicUrl}/admin" class="button">Siirry admin-paneeliin</a>
        
        <div class="footer">
          <p><i>Tämä on automaattinen viesti. Älä vastaa tähän viestiin.</i></p>
          <p>Klapi - Kaluston lainausjärjestelmä</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = `Viikottainen muistutus: ${loans.length} varausta odottaa palautusta`;
  await sendEmail([recipientEmail], subject, html);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, loans } = req.body;

  if (!loans || !Array.isArray(loans) || loans.length === 0) {
    return res.status(400).json({ message: 'No loans provided' });
  }

  try {
    await sendAdminReminderEmail(email, loans);
    res.status(200).json({ message: 'Admin reminder email sent' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Unknown error' });
    }
  }
}
