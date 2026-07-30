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

export function renderPickupReminderEmail(loan: LoanEmailData, loanUrl: string): EmailContent {
  const html = renderEmail(`
    <h1>Lainasi nouto on huomenna</h1>
    <p>Hei!</p>
    <p>Voit noutaa tavarat <strong>${formatDate(loan.startTime)}</strong> alkaen. Muistathan noutaa ne ajoissa.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Noudettavat tavarat</h2>
    ${renderItemGrid(loan.items)}

    ${renderButton(loanUrl, 'Avaa laina')}
  `);

  const subject = loan.description
    ? `Muistutus: nouto huomenna – ”${loan.description}”`
    : 'Muistutus: nouto huomenna';

  return { subject, html };
}

export async function sendPickupReminderEmail(recipientEmail: string, loanId: string) {
  const loan = await getLoanEmailData(loanId);
  const { subject, html } = renderPickupReminderEmail(loan, `${getPublicUrl()}/loan/${loanId}`);
  await sendEmail([recipientEmail], subject, html);
}
