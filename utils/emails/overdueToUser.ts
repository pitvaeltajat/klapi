import {
  renderEmail,
  renderItemGrid,
  renderLoanDetails,
  renderButton,
  formatDate,
  finnishDays,
} from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';
import { sendEmail } from './ses-client';
import { getLoanEmailData, type EmailContent, type LoanEmailData } from './shared';

/**
 * @param daysOverdue — how late the loan is, so the borrower sees it without
 *   subtracting dates themselves. Omitted only if a caller can't compute it.
 */
export function renderOverdueEmail(
  loan: LoanEmailData,
  loanUrl: string,
  daysOverdue?: number,
): EmailContent {
  const lateness = daysOverdue
    ? `, eli laina on ${finnishDays(daysOverdue)} myöhässä`
    : ', eikä lainaa ole vielä palautettu';

  const html = renderEmail(`
    <h1>Lainasi on myöhässä</h1>
    <p>Hei!</p>
    <p>Lainasi palautuspäivä oli <strong>${formatDate(loan.endTime)}</strong>${lateness}.</p>
    <p>Palauta tavarat mahdollisimman pian. Jos tarvitset lisäaikaa, ota yhteyttä ylläpitoon.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Palautettavat tavarat</h2>
    ${renderItemGrid(loan.items)}

    ${renderButton(loanUrl, 'Avaa laina')}

    <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
      Jos olet jo palauttanut tavarat, voit jättää tämän viestin huomiotta.
    </p>
  `);

  const subject = loan.description
    ? `Laina myöhässä – ”${loan.description}”`
    : 'Laina myöhässä';

  return { subject, html };
}

export async function sendOverdueEmail(
  recipientEmail: string,
  loanId: string,
  daysOverdue?: number,
) {
  const loan = await getLoanEmailData(loanId);
  const { subject, html } = renderOverdueEmail(
    loan,
    `${getPublicUrl()}/loan/${loanId}`,
    daysOverdue,
  );
  await sendEmail([recipientEmail], subject, html);
}
