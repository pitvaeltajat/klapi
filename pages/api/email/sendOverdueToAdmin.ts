import { sendEmail } from './ses-client';
import prisma from '../../../utils/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getEmailStyles } from '../../../utils/emailHelpers';
import { getPublicUrl } from '../../../utils/urlHelpers';

interface OverdueLoanInfo {
  id: string;
  userName: string;
  userEmail: string | null;
  endTime: string;
  daysOverdue: number;
}

async function sendOverdueAdminEmail(recipientEmail: string, loans: OverdueLoanInfo[]) {
  const publicUrl = getPublicUrl();

  // Group loans by days overdue
  const loansByInterval: Record<number, OverdueLoanInfo[]> = {
    1: [],
    3: [],
    7: [],
  };

  loans.forEach((loan) => {
    if (loan.daysOverdue === 1 || loan.daysOverdue === 3 || loan.daysOverdue === 7) {
      loansByInterval[loan.daysOverdue].push(loan);
    }
  });

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

  // Create a map for quick lookup
  const loanItemsMap = new Map(loanItems.map((item) => [item.loan.id, item]));

  // Generate HTML sections for each interval
  const intervalSections = [1, 3, 7]
    .map((interval) => {
      const intervalLoans = loansByInterval[interval];
      if (intervalLoans.length === 0) return '';

      const intervalColor = interval === 1 ? '#f59e0b' : interval === 3 ? '#dc2626' : '#7f1d1d';
      const intervalBg = interval === 1 ? '#fef3c7' : interval === 3 ? '#fee2e2' : '#fef2f2';

      const loansHtml = intervalLoans
        .map((loan) => {
          const loanData = loanItemsMap.get(loan.id);
          if (!loanData?.fullLoan) return '';

          const itemsList = loanData.fullLoan.reservations
            .map((r) => `${r.item.name} (${r.amount} kpl)`)
            .join(', ');

          const loanUrl = `${publicUrl}/loan/${loan.id}`;

          return `
            <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-bottom: 15px; background-color: ${intervalBg};">
              <h3 style="margin-top: 0; color: ${intervalColor};">
                <a href="${loanUrl}" style="color: ${intervalColor}; text-decoration: none;">⚠️ Varaus ${loan.id}</a>
              </h3>
              <div style="margin: 10px 0;">
                <strong>Varaaja:</strong> ${loan.userName}<br />
                <strong>Email:</strong> ${loan.userEmail || 'Ei tiedossa'}<br />
                <strong>Palautuspäivä oli:</strong> ${loan.endTime}<br />
                <strong>Myöhässä:</strong> <span style="color: ${intervalColor}; font-weight: bold;">${loan.daysOverdue} päivää</span><br />
                <strong>Tavarat:</strong> ${itemsList}
              </div>
              <a href="${loanUrl}" style="display: inline-block; padding: 8px 16px; background-color: ${intervalColor}; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Tarkastele varausta</a>
            </div>
          `;
        })
        .join('');

      const intervalTitle = interval === 1 ? '1 päivä myöhässä (ensimmäinen muistutus)' :
                           interval === 3 ? '3 päivää myöhässä (toinen muistutus)' :
                           '7 päivää myöhässä (kolmas muistutus)';

      return `
        <h2 style="color: ${intervalColor}; margin-top: 30px;">${intervalTitle} (${intervalLoans.length} varausta)</h2>
        ${loansHtml}
      `;
    })
    .filter(Boolean)
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
        <h1>⚠️ Myöhästyneitä varauksia!</h1>

        <p>Hei admin!</p>

        <p>Seuraavat <strong>${loans.length}</strong> varausta ovat saavuttaneet muistutusrajat (1, 3 tai 7 päivää myöhässä):</p>

        <div class="info-box" style="background-color: #eff6ff; border-left: 4px solid #2563eb;">
          <strong>ℹ️ Muistutuslogiikka:</strong> Saat automaattisesti ilmoituksen varauksista, kun ne ovat täsmälleen 1, 3 tai 7 päivää myöhässä. Tämä vähentää spämmiä ja keskittää huomion kriittisiin ajankohtiin.
        </div>

        ${intervalSections}

        <div class="info-box" style="background-color: #fef2f2; border-left: 4px solid #dc2626; margin-top: 30px;">
          <strong>⚠️ Toiminto vaaditaan:</strong> Ota yhteyttä varaajiin ja varmista, että tavarat palautetaan. Mitä pidempään varaus on myöhässä, sitä kiireellisempi toimenpide on tarpeen.
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

  try {
    await sendEmail(recipientEmail, `⚠️ ${loans.length} myöhästynyttä varausta`, html);
  } catch (error) {
    console.error('Failed to send overdue admin email:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, loans } = req.body;

  if (!email || !loans || !Array.isArray(loans)) {
    return res.status(400).json({ message: 'Email and loans array are required' });
  }

  try {
    await sendOverdueAdminEmail(email, loans);
    return res.status(200).json({ message: 'Overdue admin email sent successfully' });
  } catch (error) {
    console.error('Error sending overdue admin email:', error);
    return res.status(500).json({ message: 'Failed to send overdue admin email' });
  }
}
