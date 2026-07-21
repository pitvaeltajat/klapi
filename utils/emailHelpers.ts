import { getCompressedImageUrl } from './imageHelpers';
import { formatDateLong as formatDate, formatDateLongShort as formatDateShort } from './dateFormat';

export { formatDate, formatDateShort };

function getEmailStyles(): string {
  return `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f5f5f5;
      }
      .email-container {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      h1 {
        color: #111827;
        font-size: 22px;
        margin-top: 0;
        margin-bottom: 16px;
      }
      h2 {
        color: #111827;
        font-size: 16px;
        margin-top: 24px;
        margin-bottom: 12px;
      }
      p {
        margin: 12px 0;
      }
      .info-box {
        background-color: #f9fafb;
        border-left: 4px solid #2563eb;
        padding: 12px 15px;
        margin: 16px 0;
        border-radius: 4px;
      }
      .info-box.warning {
        background-color: #fef2f2;
        border-left-color: #dc2626;
      }
      .item-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
        margin: 16px 0;
      }
      .item-card {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 10px;
        text-align: center;
        background-color: #ffffff;
      }
      .item-image {
        width: 100%;
        max-width: 500px;
        height: auto;
        aspect-ratio: 5 / 3;
        object-fit: cover;
        border-radius: 4px;
        margin-bottom: 8px;
        background-color: #f3f4f6;
      }
      .item-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 2px;
        color: #111827;
      }
      .item-amount {
        font-size: 12px;
        color: #6b7280;
      }
      .button {
        display: inline-block;
        padding: 10px 20px;
        background-color: #2563eb;
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        margin: 16px 0;
        font-weight: 600;
      }
      .footer {
        margin-top: 28px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
        font-size: 12px;
        color: #6b7280;
        text-align: center;
      }
      .footer p {
        margin: 4px 0;
      }
      .loan-details {
        background-color: #f9fafb;
        padding: 12px 15px;
        border-radius: 6px;
        margin: 16px 0;
      }
      .loan-details-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .loan-details-row:last-child {
        border-bottom: none;
      }
      .loan-details-label {
        font-weight: 600;
        color: #4b5563;
      }
      .loan-details-value {
        color: #111827;
      }
      .loan-card {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 14px 16px;
        margin-bottom: 12px;
        background-color: #ffffff;
      }
      .loan-card.overdue-mild { border-left: 4px solid #f59e0b; }
      .loan-card.overdue-high { border-left: 4px solid #dc2626; }
      .loan-card.overdue-critical { border-left: 4px solid #7f1d1d; }
      .loan-card h3 {
        margin: 0 0 6px 0;
        font-size: 15px;
        color: #111827;
      }
      .loan-card h3 a {
        color: inherit;
        text-decoration: none;
      }
      .loan-card .meta {
        font-size: 13px;
        color: #4b5563;
        margin: 6px 0 10px 0;
      }
      .loan-card .meta div { margin: 2px 0; }
      .loan-card a.open-link {
        display: inline-block;
        font-size: 13px;
        color: #2563eb;
        text-decoration: none;
        font-weight: 600;
      }
    </style>
  `;
}

export function renderItemCard(item: { id: string; name: string; amount: number }): string {
  const imageUrl = getCompressedImageUrl(item.id);
  const imageStyle = 'width: 100%; max-width: 500px; height: auto; aspect-ratio: 5 / 3; object-fit: cover; border-radius: 4px; margin-bottom: 8px; background-color: #f3f4f6;';
  return `
    <div class="item-card">
      ${imageUrl ? `<img src="${imageUrl}" alt="${item.name}" class="item-image" style="${imageStyle}" width="500" height="300" />` : `<div class="item-image" style="display: flex; align-items: center; justify-content: center; color: #9ca3af; ${imageStyle}">Ei kuvaa</div>`}
      <div class="item-name">${item.name}</div>
      <div class="item-amount">${item.amount} kpl</div>
    </div>
  `;
}

export function renderLoanDetails(startTime: Date | string, endTime: Date | string, description?: string | null): string {
  return `
    <div class="loan-details">
      <div class="loan-details-row">
        <span class="loan-details-label">Nouto:</span>
        <span class="loan-details-value">${formatDate(startTime)}</span>
      </div>
      <div class="loan-details-row">
        <span class="loan-details-label">Palautus:</span>
        <span class="loan-details-value">${formatDate(endTime)}</span>
      </div>
      ${description ? `
      <div class="loan-details-row">
        <span class="loan-details-label">Kuvaus:</span>
        <span class="loan-details-value">${description}</span>
      </div>
      ` : ''}
    </div>
  `;
}

export function renderButton(href: string, label: string): string {
  return `<a href="${href}" class="button">${label}</a>`;
}

function renderFooter(): string {
  return `
    <div class="footer">
      <p><i>Tämä on automaattinen viesti. Älä vastaa tähän viestiin.</i></p>
      <p>Klapi — Kaluston lainausjärjestelmä</p>
    </div>
  `;
}

export function renderEmail(innerHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        ${innerHtml}
        ${renderFooter()}
      </div>
    </body>
    </html>
  `;
}

// Finnish genitive for names, used in subjects like "Matti Virtasen varaus on myöhässä".
// Handles the common cases: -nen → -sen, vowel-ending → +n, consonant-ending → +in.
export function finnishGenitive(name: string | null | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  const last = parts[parts.length - 1];
  let genitive: string;
  if (/nen$/i.test(last)) {
    genitive = last.slice(0, -3) + 'sen';
  } else if (/[aeiouyäöå]$/i.test(last)) {
    genitive = last + 'n';
  } else {
    genitive = last + 'in';
  }
  parts[parts.length - 1] = genitive;
  return parts.join(' ');
}
