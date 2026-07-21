import prisma from '@/utils/prisma';
import { renderEmail, renderButton, finnishGenitive } from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';
import { sendEmail } from './ses-client';
import type { EmailContent } from './shared';

export interface BoxLoanInfo {
  id: string;
  userName: string;
  startTime: string;
  boxName?: string;
}

/** A loan sitting in a box plus the item summary the template lists. */
export interface BoxLoanCard extends BoxLoanInfo {
  /** `null` when the loan could not be loaded — the card is then skipped. */
  itemsList: string | null;
}

export function renderAdminReminderEmail(loans: BoxLoanCard[], publicUrl: string): EmailContent {
  const loansListHtml = loans
    .map((loan) => {
      if (loan.itemsList === null) return '';

      const loanUrl = `${publicUrl}/loan/${loan.id}`;

      return `
        <div class="loan-card">
          <h3><a href="${loanUrl}">${loan.userName}</a></h3>
          <div class="meta">
            <div><strong>Boksi:</strong> ${loan.boxName || 'Tuntematon'}</div>
            <div><strong>Aloitettu:</strong> ${loan.startTime}</div>
            <div><strong>Tavarat:</strong> ${loan.itemsList}</div>
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

  return { subject, html };
}

export async function sendAdminReminderEmail(recipientEmail: string, loans: BoxLoanInfo[]) {
  const cards = await Promise.all(loans.map(withItemsList));
  const { subject, html } = renderAdminReminderEmail(cards, getPublicUrl());
  await sendEmail([recipientEmail], subject, html);
}

async function withItemsList(loan: BoxLoanInfo): Promise<BoxLoanCard> {
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
