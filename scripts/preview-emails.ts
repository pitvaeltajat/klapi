/**
 * Render all email templates with sample data to HTML files under /tmp/klapi-emails/.
 * Usage: tsx scripts/preview-emails.ts
 *
 * The templates here inline the body HTML from each route, using the same shared
 * helpers so the output matches production. Data access (prisma) is stubbed with
 * sample objects so this runs without the app or database.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  renderEmail,
  renderItemCard,
  renderLoanDetails,
  renderButton,
  finnishGenitive,
  formatDate,
} from '../utils/emailHelpers';

const OUT = '/tmp/klapi-emails';
mkdirSync(OUT, { recursive: true });

const publicUrl = 'https://klapi.example.com';
const sampleItems = [
  { id: 'i1', name: 'Teltta 4 hlö', amount: 2 },
  { id: 'i2', name: 'Makuupussi', amount: 4 },
  { id: 'i3', name: 'Retkikeitin', amount: 1 },
  { id: 'i4', name: 'Otsalamppu', amount: 6 },
];
const sampleLoan = {
  id: 'LOAN123',
  description: 'Partioretki Nuuksioon',
  startTime: new Date('2026-05-10T15:00:00Z'),
  endTime: new Date('2026-05-14T18:00:00Z'),
};
const loanUrl = `${publicUrl}/loan/${sampleLoan.id}`;

function writeFile(name: string, html: string, subject: string) {
  const wrapped = `<!-- SUBJECT: ${subject} -->\n${html}`;
  writeFileSync(join(OUT, `${name}.html`), wrapped, 'utf8');
  console.log(`  ${name.padEnd(28)}  subject: ${subject}`);
}

// 1. sendApproved (user)
{
  const items = sampleItems.slice(0, 3).map(renderItemCard).join('');
  const html = renderEmail(`
    <h1>Varauksesi on hyväksytty</h1>
    <p>Hei!</p>
    <p>Varauksesi on hyväksytty. Voit noutaa tavarat ilmoittamanasi ajankohtana.</p>
    ${renderLoanDetails(sampleLoan.startTime, sampleLoan.endTime, sampleLoan.description)}
    <h2>Varatut tavarat</h2>
    <div class="item-grid">${items}</div>
    ${renderButton(loanUrl, 'Avaa varaus')}
  `);
  writeFile('1-sendApproved', html, `Varauksesi "${sampleLoan.description}" on hyväksytty`);
}

// 2. sendNewLoanToUser (user)
{
  const items = sampleItems.slice(0, 3).map(renderItemCard).join('');
  const html = renderEmail(`
    <h1>Varauksesi on luotu</h1>
    <p>Hei!</p>
    <p>Varauksesi on luotu ja automaattisesti hyväksytty. Voit noutaa tavarat ilmoittamanasi ajankohtana.</p>
    ${renderLoanDetails(sampleLoan.startTime, sampleLoan.endTime, sampleLoan.description)}
    <h2>Varatut tavarat</h2>
    <div class="item-grid">${items}</div>
    ${renderButton(loanUrl, 'Avaa varaus')}
  `);
  writeFile('2-sendNewLoanToUser', html, `Varauksesi "${sampleLoan.description}" on luotu`);
}

// 3. sendNewLoanToAdmin (admin)
{
  const creator = 'Matti Virtanen';
  const items = sampleItems.slice(0, 3).map(renderItemCard).join('');
  const html = renderEmail(`
    <h1>${creator}: uusi varaus</h1>
    <p>Hei!</p>
    <p>Järjestelmään on luotu uusi varaus. Se on automaattisesti hyväksytty.</p>
    <div class="info-box">
      <strong>Varaaja:</strong> ${creator}<br />
      <strong>Sähköposti:</strong> matti.virtanen@example.com
    </div>
    ${renderLoanDetails(sampleLoan.startTime, sampleLoan.endTime, sampleLoan.description)}
    <h2>Varatut tavarat</h2>
    <div class="item-grid">${items}</div>
    ${renderButton(loanUrl, 'Avaa varaus')}
  `);
  writeFile('3-sendNewLoanToAdmin', html, `${creator}: uusi varaus "${sampleLoan.description}"`);
}

// 4. sendReminder (user, expiring)
{
  const endTime = sampleLoan.endTime;
  const items = sampleItems.slice(0, 3).map(renderItemCard).join('');
  const html = renderEmail(`
    <h1>Varauksesi päättyy pian</h1>
    <p>Hei!</p>
    <p>Varauksesi päättyy <strong>${formatDate(endTime)}</strong>. Muistathan palauttaa tavarat ajoissa.</p>
    ${renderLoanDetails(sampleLoan.startTime, sampleLoan.endTime, sampleLoan.description)}
    <h2>Palautettavat tavarat</h2>
    <div class="item-grid">${items}</div>
    ${renderButton(loanUrl, 'Avaa varaus')}
  `);
  writeFile('4-sendReminder', html, `Muistutus: "${sampleLoan.description}" päättyy pian`);
}

// 5. sendPickupReminder (user)
{
  const startTime = sampleLoan.startTime;
  const items = sampleItems.slice(0, 3).map(renderItemCard).join('');
  const html = renderEmail(`
    <h1>Noutosi alkaa huomenna</h1>
    <p>Hei!</p>
    <p>Varauksesi nouto alkaa <strong>${formatDate(startTime)}</strong>. Muistathan noutaa tavarat ajoissa.</p>
    ${renderLoanDetails(sampleLoan.startTime, sampleLoan.endTime, sampleLoan.description)}
    <h2>Noudettavat tavarat</h2>
    <div class="item-grid">${items}</div>
    ${renderButton(loanUrl, 'Avaa varaus')}
  `);
  writeFile('5-sendPickupReminder', html, `Muistutus: "${sampleLoan.description}" — nouto alkaa huomenna`);
}

// 6. sendOverdueToUser (user)
{
  const items = sampleItems.slice(0, 3).map(renderItemCard).join('');
  const html = renderEmail(`
    <h1>Varauksesi on myöhässä</h1>
    <p>Hei!</p>
    <p>Varauksesi palautuspäivä on mennyt umpeen. Palauta tavarat mahdollisimman pian — jos tarvitset lisäaikaa, ota yhteyttä ylläpitoon.</p>
    ${renderLoanDetails(sampleLoan.startTime, sampleLoan.endTime, sampleLoan.description)}
    <h2>Palautettavat tavarat</h2>
    <div class="item-grid">${items}</div>
    ${renderButton(loanUrl, 'Avaa varaus')}
    <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
      Jos olet jo palauttanut tavarat, voit jättää tämän viestin huomiotta.
    </p>
  `);
  writeFile('6-sendOverdueToUser', html, `"${sampleLoan.description}" on myöhässä`);
}

// 7. sendAdminReminder (admin — multiple loans in box > 1 week)
{
  const loans = [
    { id: 'A1', userName: 'Matti Virtanen', startTime: '14.4.2026 klo 18.00', boxName: 'Pohjoissali', items: 'Teltta (1 kpl), Makuupussi (2 kpl)' },
    { id: 'A2', userName: 'Anna Korhonen', startTime: '12.4.2026 klo 10.00', boxName: 'Eteläsali', items: 'Retkikeitin (1 kpl)' },
  ];
  const loansHtml = loans.map((l) => `
    <div class="loan-card">
      <h3><a href="${publicUrl}/loan/${l.id}">${l.userName}</a></h3>
      <div class="meta">
        <div><strong>Boksi:</strong> ${l.boxName}</div>
        <div><strong>Aloitettu:</strong> ${l.startTime}</div>
        <div><strong>Tavarat:</strong> ${l.items}</div>
      </div>
      <a href="${publicUrl}/loan/${l.id}" class="open-link">Avaa varaus →</a>
    </div>
  `).join('');
  const html = renderEmail(`
    <h1>Varauksia odottaa palautusta</h1>
    <p>Hei!</p>
    <p>Seuraavat <strong>${loans.length}</strong> varausta ovat olleet bokseissa yli viikon ja odottavat palautusta:</p>
    ${loansHtml}
    <div class="info-box">
      Ota yhteyttä varaajiin ja varmista, että tavarat palautetaan ajoissa.
    </div>
    ${renderButton(`${publicUrl}/admin`, 'Avaa admin-paneeli')}
  `);
  writeFile('7-sendAdminReminder', html, `${loans.length} varausta bokseissa yli viikon`);
}

// 7b. sendAdminReminder — single loan variant
{
  const l = { id: 'A1', userName: 'Justus Jutila', startTime: '14.4.2026 klo 18.00', boxName: 'Pohjoissali', items: 'Teltta (1 kpl), Makuupussi (2 kpl)' };
  const loansHtml = `
    <div class="loan-card">
      <h3><a href="${publicUrl}/loan/${l.id}">${l.userName}</a></h3>
      <div class="meta">
        <div><strong>Boksi:</strong> ${l.boxName}</div>
        <div><strong>Aloitettu:</strong> ${l.startTime}</div>
        <div><strong>Tavarat:</strong> ${l.items}</div>
      </div>
      <a href="${publicUrl}/loan/${l.id}" class="open-link">Avaa varaus →</a>
    </div>
  `;
  const html = renderEmail(`
    <h1>Varauksia odottaa palautusta</h1>
    <p>Hei!</p>
    <p>Seuraava varaus on ollut boksissa yli viikon ja odottaa palautusta:</p>
    ${loansHtml}
    <div class="info-box">
      Ota yhteyttä varaajiin ja varmista, että tavarat palautetaan ajoissa.
    </div>
    ${renderButton(`${publicUrl}/admin`, 'Avaa admin-paneeli')}
  `);
  writeFile('7b-sendAdminReminder-single', html, `${finnishGenitive(l.userName)} varaus on ollut boksissa yli viikon`);
}

// 8. sendOverdueToAdmin (admin — grouped by days overdue)
{
  const INTERVAL_TITLES: Record<number, string> = {
    1: 'Myöhässä 1 päivän',
    3: 'Myöhässä 3 päivää',
    7: 'Myöhässä 7 päivää',
  };
  const INTERVAL_CLASS: Record<number, string> = {
    1: 'overdue-mild',
    3: 'overdue-high',
    7: 'overdue-critical',
  };
  const loans = [
    { id: 'O1', userName: 'Matti Virtanen', userEmail: 'matti@example.com', endTime: '21.4.2026 klo 18.00', daysOverdue: 1, items: 'Teltta (1 kpl)' },
    { id: 'O2', userName: 'Anna Korhonen', userEmail: 'anna@example.com', endTime: '19.4.2026 klo 12.00', daysOverdue: 3, items: 'Retkikeitin (1 kpl), Otsalamppu (2 kpl)' },
    { id: 'O3', userName: 'Justus Jutila', userEmail: 'justus@example.com', endTime: '15.4.2026 klo 10.00', daysOverdue: 7, items: 'Makuupussi (3 kpl)' },
  ];
  const sections = [1, 3, 7].map((interval) => {
    const subset = loans.filter((l) => l.daysOverdue === interval);
    if (subset.length === 0) return '';
    const cards = subset.map((l) => `
      <div class="loan-card ${INTERVAL_CLASS[interval]}">
        <h3><a href="${publicUrl}/loan/${l.id}">${l.userName}</a></h3>
        <div class="meta">
          <div><strong>Sähköposti:</strong> ${l.userEmail}</div>
          <div><strong>Palautuspäivä oli:</strong> ${l.endTime}</div>
          <div><strong>Tavarat:</strong> ${l.items}</div>
        </div>
        <a href="${publicUrl}/loan/${l.id}" class="open-link">Avaa varaus →</a>
      </div>
    `).join('');
    return `
      <h2>${INTERVAL_TITLES[interval]} (${subset.length} ${subset.length === 1 ? 'varaus' : 'varausta'})</h2>
      ${cards}
    `;
  }).filter(Boolean).join('');
  const html = renderEmail(`
    <h1>Myöhästyneitä varauksia</h1>
    <p>Hei!</p>
    <p>Seuraavat <strong>${loans.length}</strong> varausta ovat saavuttaneet muistutusrajat (1, 3 tai 7 päivää myöhässä):</p>
    ${sections}
    <div class="info-box warning">
      Ota yhteyttä varaajiin ja varmista, että tavarat palautetaan. Mitä pidempään varaus on myöhässä, sitä kiireellisempi toimenpide on.
    </div>
    ${renderButton(`${publicUrl}/admin`, 'Avaa admin-paneeli')}
  `);
  writeFile('8-sendOverdueToAdmin', html, `${loans.length} myöhästynyttä varausta`);
}

// 8b. sendOverdueToAdmin — single loan variant
{
  const INTERVAL_CLASS = 'overdue-high';
  const l = { id: 'O1', userName: 'Justus Jutila', userEmail: 'justus@example.com', endTime: '19.4.2026 klo 12.00', daysOverdue: 3, items: 'Retkikeitin (1 kpl), Otsalamppu (2 kpl)' };
  const card = `
    <div class="loan-card ${INTERVAL_CLASS}">
      <h3><a href="${publicUrl}/loan/${l.id}">${l.userName}</a></h3>
      <div class="meta">
        <div><strong>Sähköposti:</strong> ${l.userEmail}</div>
        <div><strong>Palautuspäivä oli:</strong> ${l.endTime}</div>
        <div><strong>Tavarat:</strong> ${l.items}</div>
      </div>
      <a href="${publicUrl}/loan/${l.id}" class="open-link">Avaa varaus →</a>
    </div>
  `;
  const html = renderEmail(`
    <h1>Myöhästyneitä varauksia</h1>
    <p>Hei!</p>
    <p>Seuraava varaus on saavuttanut muistutusrajan (1, 3 tai 7 päivää myöhässä):</p>
    <h2>Myöhässä 3 päivää (1 varaus)</h2>
    ${card}
    <div class="info-box warning">
      Ota yhteyttä varaajiin ja varmista, että tavarat palautetaan. Mitä pidempään varaus on myöhässä, sitä kiireellisempi toimenpide on.
    </div>
    ${renderButton(`${publicUrl}/admin`, 'Avaa admin-paneeli')}
  `);
  writeFile('8b-sendOverdueToAdmin-single', html, `${finnishGenitive(l.userName)} varaus on myöhässä`);
}

// Write an index page
const files = [
  ['1-sendApproved', 'sendApproved — user, application approved'],
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
