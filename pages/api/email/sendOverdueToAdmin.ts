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
      const overdueClass = loan.daysOverdue > 7 ? 'background-color: #fef2f2;' : '';

      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-bottom: 15px; ${overdueClass}">
          <h3 style="margin-top: 0; color: #dc2626;">
            <a href="${loanUrl}" style="color: #dc2626; text-decoration: none;">⚠️ Varaus ${loan.id}</a>
          </h3>
          <div style="margin: 10px 0;">
            <strong>Varaaja:</strong> ${loan.userName}<br />
            <strong>Email:</strong> ${loan.userEmail || 'Ei tiedossa'}<br />
            <strong>Palautuspäivä oli:</strong> ${loan.endTime}<br />
            <strong>Myöhässä:</strong> <span style="color: #dc2626; font-weight: bold;">${loan.daysOverdue} päivää</span><br />
            <strong>Tavarat:</strong> ${itemsList}
          </div>
          <a href="${loanUrl}" style="display: inline-block; padding: 8px 16px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Tarkastele varausta</a>
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
        <h1>⚠️ Myöhästyneitä varauksia!</h1>

        <p>Hei admin!</p>

        <p>Seuraavat <strong>${loans.length}</strong> varausta ovat myöhässä palautuksesta:</p>

        ${loansListHtml}

        <div class="info-box" style="background-color: #fef2f2; border-left: 4px solid #dc2626;">
          <strong>⚠️ Toiminto vaaditaan:</strong> Ota yhteyttä varaajiin ja varmista, että tavarat palautetaan. Jos varaus on yli 7 päivää myöhässä, harkitse lisätoimenpiteitä.
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
