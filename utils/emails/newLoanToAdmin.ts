import prisma from '@/utils/prisma';
import {
  renderEmail,
  renderItemGrid,
  renderLoanDetails,
  renderButton,
} from '@/utils/emailHelpers';
import { getPublicUrl } from '@/utils/urlHelpers';
import { sendEmail } from './ses-client';
import type { EmailContent, LoanEmailData } from './shared';

export interface NewLoanAdminEmailData extends LoanEmailData {
  /** Kiosk loans go straight to INUSE and are labelled as such. */
  isKioskLoan: boolean;
  creator: string;
  creatorEmail: string | null;
}

export function renderNewLoanEmail(loan: NewLoanAdminEmailData, loanUrl: string): EmailContent {
  const { isKioskLoan, creator } = loan;

  const infoBoxStyle =
    'background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 12px 15px; margin: 16px 0; border-radius: 4px;';

  const html = renderEmail(`
    <h1>Uusi laina: ${creator}</h1>
    <p>Hei!</p>
    <p>${
      isKioskLoan
        ? 'Kaluston koneella on luotu uusi laina, ja tavarat on merkitty käyttöön heti.'
        : 'Järjestelmään on luotu uusi laina. Se on hyväksytty automaattisesti.'
    }</p>

    <div class="info-box" style="${infoBoxStyle}">
      <strong>Lainaaja:</strong> ${creator}<br />
      <strong>Sähköposti:</strong> ${loan.creatorEmail || 'Ei sähköpostia'}
    </div>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Lainatut tavarat</h2>
    ${renderItemGrid(loan.items)}

    ${renderButton(loanUrl, 'Avaa laina')}
  `);

  const subjectBase = loan.description
    ? `Uusi laina: ${creator} – ”${loan.description}”`
    : `Uusi laina: ${creator}`;
  const subject = isKioskLoan ? `${subjectBase} (kaluston kone)` : subjectBase;

  return { subject, html };
}

export async function sendNewLoanEmail(loanCreator: string, loanId: string) {
  const adminEmails = (
    await prisma.user.findMany({
      where: {
        group: 'ADMIN',
        emailNewLoanNotification: true,
        deletedAt: null,
      },
      select: { email: true },
    })
  )
    .map((user) => user.email)
    .filter((email): email is string => email !== null);

  if (adminEmails.length === 0) {
    return;
  }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: {
      status: true,
      startTime: true,
      endTime: true,
      description: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      reservations: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!loan) {
    throw new Error(`Loan ${loanId} not found`);
  }

  const { subject, html } = renderNewLoanEmail(
    {
      isKioskLoan: loan.status === 'INUSE',
      creator: loan.user.name || loanCreator || loan.user.email || 'Tuntematon lainaaja',
      creatorEmail: loan.user.email,
      description: loan.description,
      startTime: loan.startTime,
      endTime: loan.endTime,
      items: loan.reservations.map((r) => ({ id: r.item.id, name: r.item.name, amount: r.amount })),
    },
    `${getPublicUrl()}/loan/${loanId}`,
  );

  await sendEmail(adminEmails, subject, html);
}
