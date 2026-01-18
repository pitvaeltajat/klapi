import { sendEmail } from './ses-client';
import prisma from '../../../utils/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getEmailStyles, renderItemCard, renderLoanDetails, formatDate } from '../../../utils/emailHelpers';

async function sendCreatedEmail(recipientEmail: string, loanId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: {
      description: true,
      startTime: true,
      endTime: true,
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

  if (!loan) {
    throw new Error(`Loan ${loanId} not found`);
  }

  const itemsHtml = loan.reservations
    .map((reservation) => renderItemCard({ id: reservation.item.id, name: reservation.item.name, amount: reservation.amount }))
    .join('');

  const loanDetailsHtml = renderLoanDetails(loan.startTime, loan.endTime, loan.description);
  const loanUrl = `${process.env.NEXT_PUBLIC_VERCEL_URL}/loan/${loanId}`;
  const subjectText = loan.description || `Varaus ${loanId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <h1>✅ Varaus luotu</h1>
        
        <p>Hei!</p>
        
        <p>Varauksesi on luotu onnistuneesti ja se on automaattisesti hyväksytty. Voit noutaa varatut tavarat ilmoittamaasi aikaan.</p>
        
        ${loanDetailsHtml}
        
        <h2>Varatut tavarat</h2>
        <div class="item-grid">
          ${itemsHtml}
        </div>
        
        <div class="info-box">
          <strong>📋 Varaustunnus:</strong> ${loanId}<br />
          <strong>✅ Tila:</strong> Hyväksytty<br />
          <br />
          <strong>⚠️ Muistathan:</strong> Nouda varatut tavarat ilmoittamaasi aikaan. Voit tarkastella varaustasi alla olevasta linkistä.
        </div>
        
        <a href="${loanUrl}" class="button">Tarkastele varausta</a>
        
        <div class="footer">
          <p><i>Tämä on automaattinen viesti. Älä vastaa tähän viestiin.</i></p>
          <p>Klapi - Kaluston lainausjärjestelmä</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = `Varaus "${subjectText}" luotu`;
  await sendEmail([recipientEmail], subject, html);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, id } = req.body;
  try {
    await sendCreatedEmail(email, id);
    res.status(200).json({ message: 'Email sent' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Unknown error' });
    }
  }
}
