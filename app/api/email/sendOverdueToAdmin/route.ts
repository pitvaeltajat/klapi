import { NextResponse } from 'next/server';
import { sendEmail } from '../ses-client';
import prisma from '@/utils/prisma';
import { renderEmail, renderButton, finnishGenitive } from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';

interface OverdueLoanInfo {
  id: string;
  userName: string;
  userEmail: string | null;
  endTime: string;
  daysOverdue: number;
}

const INTERVAL_TITLES: Record<number, string> = {
  1: 'Myöhässä 1 päivän',
  3: 'Myöhässä 3 päivää',
  7: 'Myöhässä 7 päivää',
};

const INTERVAL_CLASS: Record<number, string> = {
  1: 'overdue-mild',
  3: 'overdue-high',
  7: 'overdue-critical',
};

async function sendOverdueAdminEmail(recipientEmail: string, loans: OverdueLoanInfo[]) {
  const publicUrl = getPublicUrl();

  const loansByInterval: Record<number, OverdueLoanInfo[]> = { 1: [], 3: [], 7: [] };
  loans.forEach((loan) => {
    if (loan.daysOverdue === 1 || loan.daysOverdue === 3 || loan.daysOverdue === 7) {
      loansByInterval[loan.daysOverdue].push(loan);
    }
  });

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

  const loanItemsMap = new Map(loanItems.map((item) => [item.loan.id, item]));

  const intervalSections = [1, 3, 7]
    .map((interval) => {
      const intervalLoans = loansByInterval[interval];
      if (intervalLoans.length === 0) return '';

      const loansHtml = intervalLoans
        .map((loan) => {
          const loanData = loanItemsMap.get(loan.id);
          if (!loanData?.fullLoan) return '';

          const itemsList = loanData.fullLoan.reservations
            .map((r) => `${r.item.name} (${r.amount} kpl)`)
            .join(', ');

          const loanUrl = `${publicUrl}/loan/${loan.id}`;

          return `
            <div class="loan-card ${INTERVAL_CLASS[interval]}">
              <h3><a href="${loanUrl}">${loan.userName}</a></h3>
              <div class="meta">
                <div><strong>Sähköposti:</strong> ${loan.userEmail || 'Ei tiedossa'}</div>
                <div><strong>Palautuspäivä oli:</strong> ${loan.endTime}</div>
                <div><strong>Tavarat:</strong> ${itemsList}</div>
              </div>
              <a href="${loanUrl}" class="open-link">Avaa varaus →</a>
            </div>
          `;
        })
        .join('');

      return `
        <h2>${INTERVAL_TITLES[interval]} (${intervalLoans.length} ${intervalLoans.length === 1 ? 'varaus' : 'varausta'})</h2>
        ${loansHtml}
      `;
    })
    .filter(Boolean)
    .join('');

  const html = renderEmail(`
    <h1>Myöhästyneitä varauksia</h1>
    <p>Hei!</p>
    <p>${loans.length === 1
      ? 'Seuraava varaus on saavuttanut muistutusrajan (1, 3 tai 7 päivää myöhässä):'
      : `Seuraavat <strong>${loans.length}</strong> varausta ovat saavuttaneet muistutusrajat (1, 3 tai 7 päivää myöhässä):`}</p>

    ${intervalSections}

    <div class="info-box warning">
      Ota yhteyttä varaajiin ja varmista, että tavarat palautetaan. Mitä pidempään varaus on myöhässä, sitä kiireellisempi toimenpide on.
    </div>

    ${renderButton(`${publicUrl}/admin`, 'Avaa admin-paneeli')}
  `);

  const subject = loans.length === 1
    ? `${finnishGenitive(loans[0].userName)} varaus on myöhässä`
    : `${loans.length} myöhästynyttä varausta`;

  try {
    await sendEmail(recipientEmail, subject, html);
  } catch (error) {
    console.error('Failed to send overdue admin email:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  const { email, loans } = await request.json();

  if (!email || !loans || !Array.isArray(loans)) {
    return NextResponse.json({ message: 'Email and loans array are required' }, { status: 400 });
  }

  try {
    await sendOverdueAdminEmail(email, loans);
    return NextResponse.json({ message: 'Overdue admin email sent successfully' });
  } catch (error) {
    console.error('Error sending overdue admin email:', error);
    return NextResponse.json({ message: 'Failed to send overdue admin email' }, { status: 500 });
  }
}
