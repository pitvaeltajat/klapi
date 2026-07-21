import prisma from '@/utils/prisma';
import {
  renderEmail,
  renderItemCard,
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

  const itemsHtml = loan.items.map(renderItemCard).join('');

  const html = renderEmail(`
    <h1>${creator}: uusi varaus${isKioskLoan ? ' (kiosk)' : ''}</h1>
    <p>Hei!</p>
    <p>Järjestelmään on luotu uusi varaus${isKioskLoan ? ' kiosk-käytön kautta' : ''}. Se on automaattisesti hyväksytty.</p>

    <div class="info-box">
      <strong>Varaaja:</strong> ${creator}<br />
      <strong>Sähköposti:</strong> ${loan.creatorEmail || 'Ei sähköpostia'}
    </div>

    ${renderLoanDetails(loan.startTime, loan.endTime, loan.description)}

    <h2>Varatut tavarat</h2>
    <div class="item-grid">${itemsHtml}</div>

    ${renderButton(loanUrl, 'Avaa varaus')}
  `);

  const subjectBase = loan.description ? `${creator}: uusi varaus "${loan.description}"` : `${creator}: uusi varaus`;
  const subject = isKioskLoan ? `${subjectBase} (kiosk)` : subjectBase;

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
      creator: loan.user.name || loanCreator || loan.user.email || 'Tuntematon varaaja',
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
