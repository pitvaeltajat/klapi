import { NextResponse } from 'next/server';
import { sendEmail } from '../ses-client';
import prisma from '@/utils/prisma';
import { getEmailStyles, renderItemCard, renderLoanDetails, formatDate } from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';

async function sendReminderEmail(
  recipientEmail: string,
  loanId: string,
  description: string | null,
  endTime: string,
) {
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
  const loanUrl = `${getPublicUrl()}/loan/${loanId}`;
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
        <h1>⏰ Muistutus: Varauksesi päättyy pian</h1>

        <p>Hei!</p>

        <p>Varauksesi päättyy <strong>${formatDate(endTime)}</strong>. Muistathan palauttaa varaamasi tavarat ajoissa.</p>

        ${loanDetailsHtml}

        <h2>Palautettavat tavarat</h2>
        <div class="item-grid">
          ${itemsHtml}
        </div>

        <div class="info-box">
          <strong>📋 Varaustunnus:</strong> ${loanId}<br />
          <strong>⏰ Palautus:</strong> ${formatDate(endTime)}<br />
          <br />
          <strong>⚠️ Muistathan:</strong> Palauta kaikki varatut tavarat ilmoittamaasi palautusajankohtaan mennessä.
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

  const subject = `Muistutus: Varaus "${subjectText}" päättyy pian`;
  await sendEmail([recipientEmail], subject, html);
}

export async function POST(request: Request) {
  const { email, id, description, endTime } = await request.json();
  try {
    await sendReminderEmail(email, id, description, endTime);
    return NextResponse.json({ message: 'Reminder email sent' });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
