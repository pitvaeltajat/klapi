/**
 * Render all email templates with sample data to HTML files under /tmp/klapi-emails/.
 * Usage: tsx scripts/preview-emails.ts
 *
 * These are the real templates from utils/emails/ — the `render*Email` half of
 * each module, called with sample data instead of the database. Nothing is
 * duplicated here, so the previews cannot drift from what production sends.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  renderAdminReminderEmail,
  renderCreatedEmail,
  renderNewLoanEmail,
  renderOverdueAdminEmail,
  renderOverdueEmail,
  renderPickupReminderEmail,
  renderReminderEmail,
  type EmailContent,
  type LoanEmailData,
} from '../utils/emails';

const OUT = '/tmp/klapi-emails';
mkdirSync(OUT, { recursive: true });

const publicUrl = 'https://klapi.example.com';
const sampleItems = [
  { id: 'i1', name: 'Teltta 4 hlö', amount: 2 },
  { id: 'i2', name: 'Makuupussi', amount: 4 },
  { id: 'i3', name: 'Retkikeitin', amount: 1 },
  { id: 'i4', name: 'Otsalamppu', amount: 6 },
];
const sampleLoan: LoanEmailData = {
  description: 'Partioretki Nuuksioon',
  startTime: new Date('2026-05-10T15:00:00Z'),
  endTime: new Date('2026-05-14T18:00:00Z'),
  items: sampleItems.slice(0, 3),
};
const loanUrl = `${publicUrl}/loan/LOAN123`;

function writeFile(name: string, { subject, html }: EmailContent) {
  const wrapped = `<!-- SUBJECT: ${subject} -->\n${html}`;
  writeFileSync(join(OUT, `${name}.html`), wrapped, 'utf8');
  console.log(`  ${name.padEnd(28)}  subject: ${subject}`);
}

// 2. sendNewLoanToUser (user)
writeFile('2-sendNewLoanToUser', renderCreatedEmail(sampleLoan, loanUrl));

// 3. sendNewLoanToAdmin (admin)
writeFile(
  '3-sendNewLoanToAdmin',
  renderNewLoanEmail(
    {
      ...sampleLoan,
      isKioskLoan: false,
      creator: 'Matti Virtanen',
      creatorEmail: 'matti.virtanen@example.com',
    },
    loanUrl,
  ),
);

// 4. sendReminder (user, expiring)
writeFile('4-sendReminder', renderReminderEmail(sampleLoan, loanUrl));

// 5. sendPickupReminder (user)
writeFile('5-sendPickupReminder', renderPickupReminderEmail(sampleLoan, loanUrl));

// 6. sendOverdueToUser (user)
writeFile('6-sendOverdueToUser', renderOverdueEmail(sampleLoan, loanUrl));

// 7. sendAdminReminder (admin — multiple loans in box > 1 week)
writeFile(
  '7-sendAdminReminder',
  renderAdminReminderEmail(
    [
      {
        id: 'A1',
        userName: 'Matti Virtanen',
        startTime: '14.4.2026 klo 18.00',
        boxName: 'Pohjoissali',
        itemsList: 'Teltta (1 kpl), Makuupussi (2 kpl)',
      },
      {
        id: 'A2',
        userName: 'Anna Korhonen',
        startTime: '12.4.2026 klo 10.00',
        boxName: 'Eteläsali',
        itemsList: 'Retkikeitin (1 kpl)',
      },
    ],
    publicUrl,
  ),
);

// 7b. sendAdminReminder — single loan variant
writeFile(
  '7b-sendAdminReminder-single',
  renderAdminReminderEmail(
    [
      {
        id: 'A1',
        userName: 'Justus Jutila',
        startTime: '14.4.2026 klo 18.00',
        boxName: 'Pohjoissali',
        itemsList: 'Teltta (1 kpl), Makuupussi (2 kpl)',
      },
    ],
    publicUrl,
  ),
);

// 8. sendOverdueToAdmin (admin — grouped by days overdue)
writeFile(
  '8-sendOverdueToAdmin',
  renderOverdueAdminEmail(
    [
      {
        id: 'O1',
        userName: 'Matti Virtanen',
        userEmail: 'matti@example.com',
        endTime: '21.4.2026 klo 18.00',
        daysOverdue: 1,
        itemsList: 'Teltta (1 kpl)',
      },
      {
        id: 'O2',
        userName: 'Anna Korhonen',
        userEmail: 'anna@example.com',
        endTime: '19.4.2026 klo 12.00',
        daysOverdue: 3,
        itemsList: 'Retkikeitin (1 kpl), Otsalamppu (2 kpl)',
      },
      {
        id: 'O3',
        userName: 'Justus Jutila',
        userEmail: 'justus@example.com',
        endTime: '15.4.2026 klo 10.00',
        daysOverdue: 7,
        itemsList: 'Makuupussi (3 kpl)',
      },
    ],
    publicUrl,
  ),
);

// 8b. sendOverdueToAdmin — single loan variant
writeFile(
  '8b-sendOverdueToAdmin-single',
  renderOverdueAdminEmail(
    [
      {
        id: 'O1',
        userName: 'Justus Jutila',
        userEmail: 'justus@example.com',
        endTime: '19.4.2026 klo 12.00',
        daysOverdue: 3,
        itemsList: 'Retkikeitin (1 kpl), Otsalamppu (2 kpl)',
      },
    ],
    publicUrl,
  ),
);

// Write an index page
const files = [
  ['2-sendNewLoanToUser', 'sendNewLoanToUser — user, auto-approved loan'],
  ['3-sendNewLoanToAdmin', 'sendNewLoanToAdmin — admin, new loan notification'],
  ['4-sendReminder', 'sendReminder — user, loan expiring in 24h'],
  ['5-sendPickupReminder', 'sendPickupReminder — user, pickup starting tomorrow'],
  ['6-sendOverdueToUser', 'sendOverdueToUser — user, loan overdue'],
  ['7-sendAdminReminder', 'sendAdminReminder — admin, N loans in box > 1 week'],
  ['7b-sendAdminReminder-single', 'sendAdminReminder — single loan variant'],
  ['8-sendOverdueToAdmin', 'sendOverdueToAdmin — admin, grouped by days overdue'],
  ['8b-sendOverdueToAdmin-single', 'sendOverdueToAdmin — single loan variant'],
];
const index = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Klapi email previews</title>
<style>body{font-family:system-ui;max-width:700px;margin:40px auto;padding:0 20px}li{margin:8px 0}</style>
</head><body><h1>Klapi email previews</h1><ul>
${files.map(([f, d]) => `<li><a href="${f}.html">${f}</a> — ${d}</li>`).join('\n')}
</ul></body></html>`;
writeFileSync(join(OUT, 'index.html'), index, 'utf8');

console.log(`\nWrote ${files.length} templates to ${OUT}`);
