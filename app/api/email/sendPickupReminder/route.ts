import { NextResponse } from 'next/server';
import { sendEmail } from '../ses-client';
import prisma from '@/utils/prisma';
import {
  renderEmail,
  renderItemCard,
  renderLoanDetails,
  renderButton,
  formatDate,
} from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';

async function sendPickupReminderEmail(
  recipientEmail: string,
  loanId: string,
  startTime: string,
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
    .map((r) => renderItemCard({ id: r.item.id, name: r.item.name, amount: r.amount }))
    .join('');

  const loanUrl = `${getPublicUrl()}/loan/${loanId}`;

  const html = renderEmail(`
    <h1>Noutosi alkaa huomenna</h1>
    <p>Hei!</p>
    <p>Varauksesi nouto alkaa <strong>${formatDate(startTime)}</strong>. Muistathan noutaa tavarat ajoissa.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Noudettavat tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus')}
  `);

  const subject = loan.description
    ? `Muistutus: "${loan.description}" — nouto alkaa huomenna`
    : 'Muistutus: nouto alkaa huomenna';
  await sendEmail([recipientEmail], subject, html);
}

export async function POST(request: Request) {
  const { email, id, startTime } = await request.json();
  try {
    await sendPickupReminderEmail(email, id, startTime);
    return NextResponse.json({ message: 'Pickup reminder email sent' });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
