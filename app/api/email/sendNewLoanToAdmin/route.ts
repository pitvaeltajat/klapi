import { NextResponse } from 'next/server';
import { sendEmail } from '../ses-client';
import prisma from '@/utils/prisma';
import { getEmailStyles, renderItemCard, renderLoanDetails } from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';

async function sendNewLoanEmail(loanCreator: string, loanId: string) {
  const adminEmails = (
    await prisma.user.findMany({
      where: {
        group: 'ADMIN',
        emailNewLoanNotification: true,
      },
      select: { email: true },
    })
  )
    .map((user) => user.email)
    .filter((email): email is string => email !== null);

  if (adminEmails.length === 0) {
    return;
  }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: {
      status: true,
      startTime: true,
      endTime: true,
      description: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
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

  const isKioskLoan = loan.status === 'INUSE';

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
        <h1>📨 Uusi varaus luotu</h1>

        <p>Hei admin!</p>

        <p>Uusi varaus on luotu järjestelmään${isKioskLoan ? ' kiosk-käytön kautta' : ''} ja se on automaattisesti hyväksytty.</p>

        <div class="info-box">
          <strong>👤 Varaaja:</strong> ${loan.user.name || loan.user.email || 'Tuntematon'}<br />
          <strong>📧 Sähköposti:</strong> ${loan.user.email || 'Ei sähköpostia'}<br />
          <strong>📋 Varaustunnus:</strong> ${loanId}<br />
          <strong>✅ Tila:</strong> ${isKioskLoan ? 'Käytössä (kiosk)' : 'Hyväksytty'}
        </div>

        ${loanDetailsHtml}

        <h2>Varatut tavarat</h2>
        <div class="item-grid">
          ${itemsHtml}
        </div>

        <div class="info-box">
          <strong>ℹ️ Tiedoksi:</strong> Varaus on automaattisesti hyväksytty. Voit tarkastella varausta alla olevasta linkistä.
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

  const subject = `Uusi varaus "${subjectText}" henkilöltä ${loanCreator}`;
  await sendEmail(adminEmails, subject, html);
}

export async function POST(request: Request) {
  const { loanCreator, id } = await request.json();
  try {
    await sendNewLoanEmail(loanCreator, id);
    return NextResponse.json({ message: 'Email sent' });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
