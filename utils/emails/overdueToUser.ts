import {
  renderEmail,
  renderItemCard,
  renderLoanDetails,
  renderButton,
} from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';
import { sendEmail } from './ses-client';
import { getLoanEmailData, type EmailContent, type LoanEmailData } from './shared';

export function renderOverdueEmail(loan: LoanEmailData, loanUrl: string): EmailContent {
  const itemsHtml = loan.items.map(renderItemCard).join('');

  const html = renderEmail(`
    <h1>Varauksesi on myöhässä</h1>
    <p>Hei!</p>
    <p>Varauksesi palautuspäivä on mennyt umpeen. Palauta tavarat mahdollisimman pian — jos tarvitset lisäaikaa, ota yhteyttä ylläpitoon.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Palautettavat tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus')}

    <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
      Jos olet jo palauttanut tavarat, voit jättää tämän viestin huomiotta.
    </p>
  `);

  const subject = loan.description
    ? `"${loan.description}" on myöhässä`
    : 'Varauksesi on myöhässä';

  return { subject, html };
}

export async function sendOverdueEmail(recipientEmail: string, loanId: string) {
  const loan = await getLoanEmailData(loanId);
  const { subject, html } = renderOverdueEmail(loan, `${getPublicUrl()}/loan/${loanId}`);
  await sendEmail(recipientEmail, subject, html);
}
