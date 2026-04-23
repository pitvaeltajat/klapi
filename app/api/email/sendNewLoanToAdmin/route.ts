import { NextResponse } from 'next/server';
import { sendEmail } from '../ses-client';
import prisma from '@/utils/prisma';
import {
  renderEmail,
  renderItemCard,
  renderLoanDetails,
  renderButton,
} from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';

export async function sendNewLoanEmail(loanCreator: string, loanId: string) {
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
  const creator = loan.user.name || loanCreator || loan.user.email || 'Tuntematon varaaja';

  const itemsHtml = loan.reservations
    .map((r) => renderItemCard({ id: r.item.id, name: r.item.name, amount: r.amount }))
    .join('');

  const loanUrl = `${getPublicUrl()}/loan/${loanId}`;

  const html = renderEmail(`
    <h1>${creator}: uusi varaus${isKioskLoan ? ' (kiosk)' : ''}</h1>
    <p>Hei!</p>
    <p>Järjestelmään on luotu uusi varaus${isKioskLoan ? ' kiosk-käytön kautta' : ''}. Se on automaattisesti hyväksytty.</p>

    <div class="info-box">
      <strong>Varaaja:</strong> ${creator}<br />
      <strong>Sähköposti:</strong> ${loan.user.email || 'Ei sähköpostia'}
    </div>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Varatut tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus')}
  `);

  const subjectBase = loan.description ? `${creator}: uusi varaus "${loan.description}"` : `${creator}: uusi varaus`;
  const subject = isKioskLoan ? `${subjectBase} (kiosk)` : subjectBase;
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
