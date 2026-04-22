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
    .map((r) => renderItemCard({ id: r.item.id, name: r.item.name, amount: r.amount }))
    .join('');

  const loanUrl = `${getPublicUrl()}/loan/${loanId}`;

  const html = renderEmail(`
    <h1>Varauksesi on myöhässä</h1>
    <p>Hei!</p>
    <p>Varauksesi palautuspäivä on mennyt umpeen. Palauta tavarat mahdollisimman pian — jos tarvitset lisäaikaa, ota yhteyttä ylläpitoon.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Palautettavat tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus')}

    <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
      Jos olet jo palauttanut tavarat, voit jättää tämän viestin huomiotta.
    </p>
  `);

  const subject = loan.description
    ? `"${loan.description}" on myöhässä`
    : 'Varauksesi on myöhässä';

  try {
    await sendEmail(recipientEmail, subject, html);
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
