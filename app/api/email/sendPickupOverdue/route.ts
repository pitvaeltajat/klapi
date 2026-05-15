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

async function sendPickupOverdueEmail(recipientEmail: string, loanId: string) {
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
    <h1>Muista merkitä lainasi käyttöön</h1>
    <p>Hei!</p>
    <p>
      Varauksesi nouto alkoi <strong>${formatDate(loan.startTime)}</strong>, mutta lainaa ei ole
      vielä merkitty käyttöön.
    </p>
    <p>
      Jos olet jo hakenut tavarat varastosta, avaa varaus ja paina <strong>"Aloita lainaus"</strong>.
      Näin varasto pysyy ajan tasalla ja voit myöhemmin palauttaa tavarat normaalisti.
    </p>
    <p>Jos et enää tarvitse varausta, voit perua sen samasta näkymästä.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Varatut tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus ja aloita lainaus')}
  `);

  const subject = loan.description
    ? `Muistutus: merkitse laina "${loan.description}" käyttöön`
    : 'Muistutus: merkitse lainasi käyttöön';
  await sendEmail([recipientEmail], subject, html);
}

export async function POST(request: Request) {
  const { email, id } = await request.json();
  try {
    await sendPickupOverdueEmail(email, id);
    return NextResponse.json({ message: 'Pickup overdue reminder email sent' });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
