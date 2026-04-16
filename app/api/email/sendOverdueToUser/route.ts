import { NextResponse } from 'next/server';
import { sendEmail } from '../ses-client';
import prisma from '@/utils/prisma';
import { getEmailStyles, renderItemCard, renderLoanDetails } from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';

async function sendOverdueEmail(recipientEmail: string, loanId: string) {
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
        <h1>⚠️ Varauksesi on myöhässä!</h1>

        <p>Hei!</p>

        <p>Varauksesi palautuspäivä on mennyt umpeen. Ole hyvä ja palauta tavarat mahdollisimman pian.</p>

        ${loanDetailsHtml}

        <div class="info-box">
          <strong>📦 Varatut tavarat:</strong>
          ${itemsHtml}
        </div>

        <div class="info-box" style="background-color: #fef2f2; border-left: 4px solid #dc2626;">
          <strong>⚠️ Toiminto vaaditaan:</strong> Palauta tavarat mahdollisimman pian. Jos tarvitset lisäaikaa, ota yhteyttä ylläpitoon.
        </div>

        <a href="${loanUrl}" class="button">Näytä varauksesi</a>

        <div class="footer">
          <p><i>Tämä on automaattinen muistutus. Jos olet jo palauttanut tavarat, voit jättää tämän viestin huomiotta.</i></p>
          <p>Klapi - Kaluston lainausjärjestelmä</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail(recipientEmail, `⚠️ Myöhästynyt varaus: ${subjectText}`, html);
  } catch (error) {
    console.error('Failed to send overdue email:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  const { email, id } = await request.json();

  if (!email || !id) {
    return NextResponse.json({ message: 'Email and ID are required' }, { status: 400 });
  }

  try {
    await sendOverdueEmail(email, id);
    return NextResponse.json({ message: 'Overdue email sent successfully' });
  } catch (error) {
    console.error('Error sending overdue email:', error);
    return NextResponse.json({ message: 'Failed to send overdue email' }, { status: 500 });
  }
}
