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

export function renderPickupOverdueEmail(loan: LoanEmailData, loanUrl: string): EmailContent {
  const html = renderEmail(`
    <h1>Muista merkitä lainasi käyttöön</h1>
    <p>Hei!</p>
    <p>
      Lainasi nouto alkoi <strong>${formatDate(loan.startTime)}</strong>, mutta lainaa ei ole
      vielä merkitty käyttöön.
    </p>
    <p>
      Jos olet jo hakenut tavarat varastosta, avaa laina ja paina <strong>”Aloita lainaus”</strong>.
      Näin varasto pysyy ajan tasalla ja voit myöhemmin palauttaa tavarat normaalisti.
    </p>
    <p>Jos et enää tarvitse lainaa, voit perua sen samasta näkymästä.</p>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Lainatut tavarat</h2>
    ${renderItemGrid(loan.items)}

    ${renderButton(loanUrl, 'Avaa laina ja aloita lainaus')}
  `);

  const subject = loan.description
    ? `Muistutus: merkitse laina ”${loan.description}” käyttöön`
    : 'Muistutus: merkitse lainasi käyttöön';

  return { subject, html };
}

export async function sendPickupOverdueEmail(recipientEmail: string, loanId: string) {
  const loan = await getLoanEmailData(loanId);
  const { subject, html } = renderPickupOverdueEmail(loan, `${getPublicUrl()}/loan/${loanId}`);
  await sendEmail([recipientEmail], subject, html);
}
