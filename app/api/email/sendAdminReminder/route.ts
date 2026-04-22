import { NextResponse } from 'next/server';
import { sendEmail } from '../ses-client';
import prisma from '@/utils/prisma';
import {
  renderEmail,
  renderButton,
  finnishGenitive,
} from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';

interface LoanInfo {
  id: string;
  userName: string;
  startTime: string;
  boxName?: string;
}

async function sendAdminReminderEmail(recipientEmail: string, loans: LoanInfo[]) {
  const publicUrl = getPublicUrl();

  const loanItems = await Promise.all(
    loans.map(async (loan) => {
      const fullLoan = await prisma.loan.findUnique({
        where: { id: loan.id },
        include: {
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
      return { loan, fullLoan };
    }),
  );

  const loansListHtml = loanItems
    .map(({ loan, fullLoan }) => {
      if (!fullLoan) return '';

      const itemsList = fullLoan.reservations
        .map((r) => `${r.item.name} (${r.amount} kpl)`)
        .join(', ');

      const loanUrl = `${publicUrl}/loan/${loan.id}`;

      return `
        <div class="loan-card">
          <h3><a href="${loanUrl}">${loan.userName}</a></h3>
          <div class="meta">
            <div><strong>Boksi:</strong> ${loan.boxName || 'Tuntematon'}</div>
            <div><strong>Aloitettu:</strong> ${loan.startTime}</div>
            <div><strong>Tavarat:</strong> ${itemsList}</div>
          </div>
          <a href="${loanUrl}" class="open-link">Avaa varaus →</a>
        </div>
      `;
    })
    .join('');

  const html = renderEmail(`
    <h1>Varauksia odottaa palautusta</h1>
    <p>Hei!</p>
    <p>${loans.length === 1
      ? 'Seuraava varaus on ollut boksissa yli viikon ja odottaa palautusta:'
      : `Seuraavat <strong>${loans.length}</strong> varausta ovat olleet bokseissa yli viikon ja odottavat palautusta:`}</p>

    ${loansListHtml}

    <div class="info-box">
      Ota yhteyttä varaajiin ja varmista, että tavarat palautetaan ajoissa.
    </div>

    ${renderButton(`${publicUrl}/admin`, 'Avaa admin-paneeli')}
  `);

  const subject = loans.length === 1
    ? `${finnishGenitive(loans[0].userName)} varaus on ollut boksissa yli viikon`
    : `${loans.length} varausta bokseissa yli viikon`;
  await sendEmail([recipientEmail], subject, html);
}

export async function POST(request: Request) {
  const { email, loans } = await request.json();

  if (!loans || !Array.isArray(loans) || loans.length === 0) {
    return NextResponse.json({ message: 'No loans provided' }, { status: 400 });
  }

  try {
    await sendAdminReminderEmail(email, loans);
    return NextResponse.json({ message: 'Admin reminder email sent' });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
