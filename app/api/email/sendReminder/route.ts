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

async function sendReminderEmail(
  recipientEmail: string,
  loanId: string,
  _description: string | null,
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
    .map((r) => renderItemCard({ id: r.item.id, name: r.item.name, amount: r.amount }))
    .join('');

  const loanUrl = `${getPublicUrl()}/loan/${loanId}`;

  const html = renderEmail(`
    <h1>Varauksesi päättyy pian</h1>
    <p>Hei!</p>
    <p>Varauksesi päättyy <strong>${formatDate(endTime)}</strong>. Muistathan palauttaa tavarat ajoissa.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Palautettavat tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus')}
  `);

  const subject = loan.description
    ? `Muistutus: "${loan.description}" päättyy pian`
    : 'Muistutus: varauksesi päättyy pian';
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
