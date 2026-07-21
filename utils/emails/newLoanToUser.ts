import {
  renderEmail,
  renderItemCard,
  renderLoanDetails,
  renderButton,
} from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';
import { sendEmail } from './ses-client';
import { getLoanEmailData, type EmailContent, type LoanEmailData } from './shared';

export function renderCreatedEmail(loan: LoanEmailData, loanUrl: string): EmailContent {
  const itemsHtml = loan.items.map(renderItemCard).join('');

  const html = renderEmail(`
    <h1>Varauksesi on luotu</h1>
    <p>Hei!</p>
    <p>Varauksesi on luotu ja automaattisesti hyväksytty. Voit noutaa tavarat ilmoittamanasi ajankohtana.</p>
    <p>
      <strong>Muista:</strong> kun olet hakenut tavarat varastosta, avaa varaus ja paina
      <strong>"Aloita lainaus"</strong>. Vasta silloin laina on merkitty käyttöön — muuten
      tavarat näkyvät järjestelmässä yhä vapaina etkä voi myöhemmin palauttaa niitä normaalisti.
    </p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Varatut tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus')}
  `);

  const subject = loan.description
    ? `Varauksesi "${loan.description}" on luotu`
    : 'Varauksesi on luotu';

  return { subject, html };
}

export async function sendCreatedEmail(recipientEmail: string, loanId: string) {
  const loan = await getLoanEmailData(loanId);
  const { subject, html } = renderCreatedEmail(loan, `${getPublicUrl()}/loan/${loanId}`);
  await sendEmail([recipientEmail], subject, html);
}
