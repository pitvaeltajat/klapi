import {
  renderEmail,
  renderItemGrid,
  renderLoanDetails,
  renderButton,
  formatDate,
} from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';
import { sendEmail } from './ses-client';
import { getLoanEmailData, type EmailContent, type LoanEmailData } from './shared';

export function renderReminderEmail(loan: LoanEmailData, loanUrl: string): EmailContent {
  const html = renderEmail(`
    <h1>Lainasi päättyy huomenna</h1>
    <p>Hei!</p>
    <p>Lainasi päättyy <strong>${formatDate(loan.endTime)}</strong>. Muistathan palauttaa tavarat ajoissa.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Palautettavat tavarat</h2>
    ${renderItemGrid(loan.items)}

    ${renderButton(loanUrl, 'Avaa laina')}
  `);

  const subject = loan.description
    ? `Muistutus: laina päättyy huomenna – ”${loan.description}”`
    : 'Muistutus: laina päättyy huomenna';

  return { subject, html };
}

export async function sendReminderEmail(recipientEmail: string, loanId: string) {
  const loan = await getLoanEmailData(loanId);
  const { subject, html } = renderReminderEmail(loan, `${getPublicUrl()}/loan/${loanId}`);
  await sendEmail([recipientEmail], subject, html);
}
