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

export function renderPickupReminderEmail(loan: LoanEmailData, loanUrl: string): EmailContent {
  const itemsHtml = loan.items.map(renderItemCard).join('');

  const html = renderEmail(`
    <h1>Noutosi alkaa huomenna</h1>
    <p>Hei!</p>
    <p>Varauksesi nouto alkaa <strong>${formatDate(loan.startTime)}</strong>. Muistathan noutaa tavarat ajoissa.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Noudettavat tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus')}
  `);

  const subject = loan.description
    ? `Muistutus: "${loan.description}" — nouto alkaa huomenna`
    : 'Muistutus: nouto alkaa huomenna';

  return { subject, html };
}

export async function sendPickupReminderEmail(recipientEmail: string, loanId: string) {
  const loan = await getLoanEmailData(loanId);
  const { subject, html } = renderPickupReminderEmail(loan, `${getPublicUrl()}/loan/${loanId}`);
  await sendEmail([recipientEmail], subject, html);
}
