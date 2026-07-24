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

// Same colours as the .loan-card.overdue-* CSS, inlined so the severity stripe
// survives clients that drop the <style> block.
const INTERVAL_BORDER: Record<number, string> = {
  1: '#f59e0b',
  3: '#dc2626',
  7: '#7f1d1d',
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
          const cardStyle = `border: 1px solid #e5e7eb; border-left: 4px solid ${INTERVAL_BORDER[interval]}; border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; background-color: #ffffff;`;

          return `
            <div class="loan-card ${INTERVAL_CLASS[interval]}" style="${cardStyle}">
              <h3 style="margin: 0 0 6px 0; font-size: 15px; color: #111827;"><a href="${loanUrl}" style="color: inherit; text-decoration: none;">${loan.userName}</a></h3>
              <div class="meta" style="font-size: 13px; color: #4b5563; margin: 6px 0 10px 0;">
                <div><strong>Sähköposti:</strong> ${loan.userEmail || 'Ei tiedossa'}</div>
                <div><strong>Palautuspäivä oli:</strong> ${loan.endTime}</div>
                <div><strong>Tavarat:</strong> ${loan.itemsList}</div>
              </div>
              <a href="${loanUrl}" class="open-link" style="font-size: 13px; color: #2563eb; text-decoration: none; font-weight: 600;">Avaa laina →</a>
            </div>
          `;
        })
        .join('');

      return `
        <h2>${INTERVAL_TITLES[interval]} (${intervalLoans.length} ${intervalLoans.length === 1 ? 'laina' : 'lainaa'})</h2>
        ${loansHtml}
      `;
    })
    .filter(Boolean)
    .join('');

  const warningBoxStyle =
    'background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 15px; margin: 16px 0; border-radius: 4px;';

  const html = renderEmail(`
    <h1>Myöhästyneitä lainoja</h1>
    <p>Hei!</p>
    <p>${loans.length === 1
      ? 'Seuraava laina on saavuttanut muistutusrajan (1, 3 tai 7 päivää myöhässä):'
      : `Seuraavat <strong>${loans.length}</strong> lainaa ovat saavuttaneet muistutusrajat (1, 3 tai 7 päivää myöhässä):`}</p>

    ${intervalSections}

    <div class="info-box warning" style="${warningBoxStyle}">
      Ota yhteyttä lainaajiin ja varmista, että tavarat palautetaan. Mitä pidempään laina on myöhässä, sitä kiireellisempi toimenpide on.
    </div>

    ${renderButton(`${publicUrl}/admin`, 'Avaa admin-paneeli')}
  `);

  const subject = loans.length === 1
    ? `${finnishGenitive(loans[0].userName)} laina on myöhässä`
    : `${loans.length} myöhästynyttä lainaa`;

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
