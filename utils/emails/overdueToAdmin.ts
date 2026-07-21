import prisma from '@/utils/prisma';
import { renderEmail, renderButton, finnishGenitive } from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';
import { sendEmail } from './ses-client';
import type { EmailContent } from './shared';

export interface OverdueLoanInfo {
  id: string;
  userName: string;
  userEmail: string | null;
  endTime: string;
  daysOverdue: number;
}

/** An overdue loan plus the item summary the template lists. */
export interface OverdueLoanCard extends OverdueLoanInfo {
  /** `null` when the loan could not be loaded — the card is then skipped. */
  itemsList: string | null;
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

export function renderOverdueAdminEmail(loans: OverdueLoanCard[], publicUrl: string): EmailContent {
  const loansByInterval: Record<number, OverdueLoanCard[]> = { 1: [], 3: [], 7: [] };
  loans.forEach((loan) => {
    if (loan.daysOverdue === 1 || loan.daysOverdue === 3 || loan.daysOverdue === 7) {
      loansByInterval[loan.daysOverdue].push(loan);
    }
  });

  const intervalSections = [1, 3, 7]
    .map((interval) => {
      const intervalLoans = loansByInterval[interval];
      if (intervalLoans.length === 0) return '';

      const loansHtml = intervalLoans
        .map((loan) => {
          if (loan.itemsList === null) return '';

          const loanUrl = `${publicUrl}/loan/${loan.id}`;

          return `
            <div class="loan-card ${INTERVAL_CLASS[interval]}">
              <h3><a href="${loanUrl}">${loan.userName}</a></h3>
              <div class="meta">
                <div><strong>Sähköposti:</strong> ${loan.userEmail || 'Ei tiedossa'}</div>
                <div><strong>Palautuspäivä oli:</strong> ${loan.endTime}</div>
                <div><strong>Tavarat:</strong> ${loan.itemsList}</div>
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

  return { subject, html };
}

export async function sendOverdueAdminEmail(recipientEmail: string, loans: OverdueLoanInfo[]) {
  const cards = await Promise.all(loans.map(withItemsList));
  const { subject, html } = renderOverdueAdminEmail(cards, getPublicUrl());
  await sendEmail(recipientEmail, subject, html);
}

async function withItemsList(loan: OverdueLoanInfo): Promise<OverdueLoanCard> {
  const fullLoan = await prisma.loan.findUnique({
    where: { id: loan.id },
    select: {
      reservations: {
        include: {
          item: { select: { name: true } },
        },
      },
    },
  });

  return {
    ...loan,
    itemsList:
      fullLoan?.reservations.map((r) => `${r.item.name} (${r.amount} kpl)`).join(', ') ?? null,
  };
}
