import {
  renderEmail,
  renderItemGrid,
  renderLoanDetails,
  renderButton,
} from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';
import { sendEmail } from './ses-client';
import { getLoanEmailData, type EmailContent, type LoanEmailData } from './shared';

/**
 * @param alreadyInUse — kiosk loans are created straight to INUSE (the loaner is
 *   standing at the terminal with the gear), so they skip the "remember to press
 *   Aloita lainaus" instruction and are told the loan is already running.
 */
export function renderCreatedEmail(
  loan: LoanEmailData,
  loanUrl: string,
  alreadyInUse = false,
): EmailContent {
  const intro = alreadyInUse
    ? `
    <p>Lainasi on luotu ja merkitty käyttöön kaluston koneella. Tavarat ovat nyt lainassa nimissäsi.</p>
    <p>Muistathan palauttaa tavarat viimeistään palautuspäivänä. Näet lainasi ja voit palauttaa sen omalta tililtäsi.</p>
    `
    : `
    <p>Lainasi on luotu ja automaattisesti hyväksytty. Voit noutaa tavarat ilmoittamanasi ajankohtana.</p>
    <p>
      Kun olet hakenut tavarat varastosta, avaa laina ja paina <strong>”Aloita lainaus”</strong>,
      niin varasto pysyy ajan tasalla. Jos unohdat, laina merkitään käyttöön automaattisesti
      noutopäivän iltana.
    </p>
    `;

  const html = renderEmail(`
    <h1>Lainasi on luotu</h1>
    <p>Hei!</p>
    ${intro}
    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Lainatut tavarat</h2>
    ${renderItemGrid(loan.items)}

    ${renderButton(loanUrl, 'Avaa laina')}
  `);

  const subject = loan.description
    ? `Lainasi ”${loan.description}” on luotu`
    : 'Lainasi on luotu';

  return { subject, html };
}

export async function sendCreatedEmail(
  recipientEmail: string,
  loanId: string,
  alreadyInUse = false,
) {
  const loan = await getLoanEmailData(loanId);
  const { subject, html } = renderCreatedEmail(
    loan,
    `${getPublicUrl()}/loan/${loanId}`,
    alreadyInUse,
  );
  await sendEmail([recipientEmail], subject, html);
}
