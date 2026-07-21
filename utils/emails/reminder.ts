import {
  renderEmail,
  renderItemCard,
  renderLoanDetails,
  renderButton,
  formatDate,
} from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';
import { sendEmail } from './ses-client';
import { getLoanEmailData, type EmailContent, type LoanEmailData } from './shared';

export function renderReminderEmail(loan: LoanEmailData, loanUrl: string): EmailContent {
  const itemsHtml = loan.items.map(renderItemCard).join('');

  const html = renderEmail(`
    <h1>Varauksesi päättyy pian</h1>
    <p>Hei!</p>
    <p>Varauksesi päättyy <strong>${formatDate(loan.endTime)}</strong>. Muistathan palauttaa tavarat ajoissa.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Palautettavat tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus')}
  `);

  const subject = loan.description
    ? `Muistutus: "${loan.description}" päättyy pian`
    : 'Muistutus: varauksesi päättyy pian';

  return { subject, html };
}

export async function sendReminderEmail(recipientEmail: string, loanId: string) {
  const loan = await getLoanEmailData(loanId);
  const { subject, html } = renderReminderEmail(loan, `${getPublicUrl()}/loan/${loanId}`);
  await sendEmail([recipientEmail], subject, html);
}
