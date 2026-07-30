import prisma from '@/utils/prisma';
import { renderEmail, renderButton, finnishLoanCount } from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';
import { sendEmail } from './ses-client';
import type { EmailContent } from './shared';

export interface BoxLoanInfo {
  id: string;
  userName: string;
  /** The template asks admins to contact the loaner, so it lists the address. */
  userEmail: string | null;
  startTime: string;
  boxName?: string;
}

/** A loan sitting in a box plus the item summary the template lists. */
export interface BoxLoanCard extends BoxLoanInfo {
  /** `null` when the loan could not be loaded — the card is then skipped. */
  itemsList: string | null;
}

export function renderAdminReminderEmail(loans: BoxLoanCard[], publicUrl: string): EmailContent {
  const cardStyle =
    'border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; background-color: #ffffff;';
  const infoBoxStyle =
    'background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 12px 15px; margin: 16px 0; border-radius: 4px;';

  const loansListHtml = loans
    .map((loan) => {
      if (loan.itemsList === null) return '';

      const loanUrl = `${publicUrl}/loan/${loan.id}`;

      return `
        <div class="loan-card" style="${cardStyle}">
          <h3 style="margin: 0 0 6px 0; font-size: 15px; color: #111827;"><a href="${loanUrl}" style="color: inherit; text-decoration: none;">${loan.userName}</a></h3>
          <div class="meta" style="font-size: 13px; color: #4b5563; margin: 6px 0 10px 0;">
            <div><strong>Sähköposti:</strong> ${loan.userEmail || 'Ei tiedossa'}</div>
            <div><strong>Boksi:</strong> ${loan.boxName || 'Tuntematon'}</div>
            <div><strong>Laina alkoi:</strong> ${loan.startTime}</div>
            <div><strong>Tavarat:</strong> ${loan.itemsList}</div>
          </div>
          <a href="${loanUrl}" class="open-link" style="font-size: 13px; color: #2563eb; text-decoration: none; font-weight: 600;">Avaa laina →</a>
        </div>
      `;
    })
    .join('');

  const single = loans.length === 1;

  const html = renderEmail(`
    <h1>${single ? 'Laina odottaa palautusta' : 'Lainat odottavat palautusta'}</h1>
    <p>Hei!</p>
    <p>${
      single
        ? 'Seuraava laina on ollut boksissa yli viikon eikä sitä ole vielä kuitattu palautetuksi:'
        : `Seuraavat <strong>${loans.length}</strong> lainaa ovat olleet bokseissa yli viikon eikä niitä ole vielä kuitattu palautetuiksi:`
    }</p>

    ${loansListHtml}

    <div class="info-box" style="${infoBoxStyle}">
      ${single ? 'Muistuta lainaajaa palauttamaan tavarat.' : 'Muistuta lainaajia palauttamaan tavarat.'}
    </div>

    ${renderButton(`${publicUrl}/admin`, 'Avaa admin-paneeli')}
  `);

  // Numeral + partitive takes a singular verb ("3 lainaa odottaa"), so one
  // phrasing is correct for both counts.
  const subject = `${finnishLoanCount(loans.length)} odottaa palautusta yli viikon`;

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
