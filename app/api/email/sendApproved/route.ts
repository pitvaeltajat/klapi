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

async function sendApproveEmail(recipientEmail: string, loanId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: {
      description: true,
      startTime: true,
      endTime: true,
      user: {
        select: {
          id: true,
          emailNewLoanNotification: true,
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

  if (loan.user.emailNewLoanNotification === false) {
    return;
  }

  const itemsHtml = loan.reservations
    .map((r) => renderItemCard({ id: r.item.id, name: r.item.name, amount: r.amount }))
    .join('');

  const loanUrl = `${getPublicUrl()}/loan/${loanId}`;

  const html = renderEmail(`
    <h1>Varauksesi on hyväksytty</h1>
    <p>Hei!</p>
    <p>Varauksesi on hyväksytty. Voit noutaa tavarat ilmoittamanasi ajankohtana.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Varatut tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus')}
  `);

  const subject = loan.description
    ? `Varauksesi "${loan.description}" on hyväksytty`
    : 'Varauksesi on hyväksytty';
  await sendEmail([recipientEmail], subject, html);
}

export async function POST(request: Request) {
  const { email, id } = await request.json();
  try {
    await sendApproveEmail(email, id);
    return NextResponse.json({ message: 'Email sent' });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
