import { getCompressedImageUrl } from './imageHelpers';
import { formatDateLong as formatDate, formatDateLongShort as formatDateShort } from './dateFormat';

export { formatDate, formatDateShort };

function getEmailStyles(): string {
  return `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #33314D;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ECF2FE;
      }
      .email-container {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      h1 {
        color: #221E5D;
        font-size: 22px;
        margin-top: 0;
        margin-bottom: 16px;
      }
      h2 {
        color: #221E5D;
        font-size: 16px;
        margin-top: 24px;
        margin-bottom: 12px;
      }
      p {
        margin: 12px 0;
      }
      .info-box {
        background-color: #F1F5FE;
        border-left: 4px solid #221E5D;
        padding: 12px 15px;
        margin: 16px 0;
        border-radius: 4px;
      }
      .info-box.warning {
        background-color: #F7ECEB;
        border-left-color: #A23936;
      }
      /* Inline-block, not CSS grid: Gmail/Outlook strip display:grid, which
         blows each card up to full width. Inline-block cards wrap and centre in
         every client, and stack cleanly on a phone. */
      .item-grid {
        text-align: center;
        font-size: 0;
        margin: 16px 0;
      }
      .item-card {
        display: inline-block;
        width: 150px;
        vertical-align: top;
        margin: 6px;
        border: 1px solid #DDD9D7;
        border-radius: 6px;
        padding: 10px;
        text-align: center;
        background-color: #ffffff;
        font-size: 14px;
      }
      .item-image {
        width: 100%;
        height: auto;
        aspect-ratio: 5 / 3;
        object-fit: cover;
        border-radius: 4px;
        margin-bottom: 8px;
        background-color: #EAE7E6;
      }
      .item-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 2px;
        color: #221E5D;
      }
      .item-amount {
        font-size: 12px;
        color: #5A5874;
      }
      .button {
        display: inline-block;
        padding: 10px 20px;
        background-color: #221E5D;
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        margin: 16px 0;
        font-weight: 600;
      }
      .footer {
        margin-top: 28px;
        padding-top: 16px;
        border-top: 1px solid #DDD9D7;
        font-size: 12px;
        color: #5A5874;
        text-align: center;
      }
      .footer p {
        margin: 4px 0;
      }
      .loan-details {
        background-color: #F1F5FE;
        padding: 12px 15px;
        border-radius: 6px;
        margin: 16px 0;
      }
      /* Block rows, not flex: on a narrow phone the label and value stack under
         each other instead of being squeezed onto one cramped line. */
      .loan-details-row {
        padding: 6px 0;
        border-bottom: 1px solid #DDD9D7;
      }
      .loan-details-row:last-child {
        border-bottom: none;
      }
      .loan-details-label {
        font-weight: 600;
        color: #4A4864;
        margin-right: 6px;
      }
      .loan-details-value {
        color: #221E5D;
      }
      .loan-card {
        border: 1px solid #DDD9D7;
        border-radius: 6px;
        padding: 14px 16px;
        margin-bottom: 12px;
        background-color: #ffffff;
      }
      .loan-card.overdue-mild { border-left: 4px solid #82593E; }
      .loan-card.overdue-high { border-left: 4px solid #A23936; }
      .loan-card.overdue-critical { border-left: 4px solid #6B2523; }
      .loan-card h3 {
        margin: 0 0 6px 0;
        font-size: 15px;
        color: #221E5D;
      }
      .loan-card h3 a {
        color: inherit;
        text-decoration: none;
      }
      .loan-card .meta {
        font-size: 13px;
        color: #4A4864;
        margin: 6px 0 10px 0;
      }
      .loan-card .meta div { margin: 2px 0; }
      .loan-card a.open-link {
        display: inline-block;
        font-size: 13px;
        color: #221E5D;
        text-decoration: none;
        font-weight: 600;
      }
      @media only screen and (max-width: 600px) {
        body { padding: 8px !important; }
        .email-container { padding: 20px !important; }
      }
    </style>
  `;
}

// Cards carry inline styles (not just the class) so they still read as cards in
// clients that drop the <style> block, e.g. Gmail on some accounts.
export function renderItemCard(item: { id: string; name: string; amount: number }): string {
  const imageUrl = getCompressedImageUrl(item.id);
  const cardStyle =
    'display: inline-block; width: 150px; vertical-align: top; margin: 6px; border: 1px solid #DDD9D7; border-radius: 6px; padding: 10px; text-align: center; background-color: #ffffff; font-size: 14px;';
  const imageStyle =
    'width: 100%; height: 90px; object-fit: cover; border-radius: 4px; margin-bottom: 8px; background-color: #EAE7E6;';
  return `
    <div class="item-card" style="${cardStyle}">
      ${imageUrl ? `<img src="${imageUrl}" alt="${item.name}" class="item-image" style="${imageStyle}" width="130" height="90" />` : `<div class="item-image" style="display: flex; align-items: center; justify-content: center; color: #8F8DA3; ${imageStyle}">Ei kuvaa</div>`}
      <div class="item-name" style="font-weight: 600; font-size: 14px; margin-bottom: 2px; color: #221E5D;">${item.name}</div>
      <div class="item-amount" style="font-size: 12px; color: #5A5874;">${item.amount} kpl</div>
    </div>
  `;
}

/** The full block of item cards, wrapped in an inline-styled centred grid. */
export function renderItemGrid(items: { id: string; name: string; amount: number }[]): string {
  const cards = items.map(renderItemCard).join('');
  return `<div class="item-grid" style="text-align: center; font-size: 0; margin: 16px 0;">${cards}</div>`;
}

export function renderLoanDetails(startTime: Date | string, endTime: Date | string, description?: string | null): string {
  const rowStyle = 'padding: 6px 0; border-bottom: 1px solid #DDD9D7;';
  const labelStyle = 'font-weight: 600; color: #4A4864; margin-right: 6px;';
  const valueStyle = 'color: #221E5D;';
  return `
    <div class="loan-details" style="background-color: #F1F5FE; padding: 12px 15px; border-radius: 6px; margin: 16px 0;">
      <div class="loan-details-row" style="${rowStyle}">
        <span class="loan-details-label" style="${labelStyle}">Nouto:</span>
        <span class="loan-details-value" style="${valueStyle}">${formatDate(startTime)}</span>
      </div>
      <div class="loan-details-row" style="${rowStyle}">
        <span class="loan-details-label" style="${labelStyle}">Palautus:</span>
        <span class="loan-details-value" style="${valueStyle}">${formatDate(endTime)}</span>
      </div>
      ${description ? `
      <div class="loan-details-row" style="padding: 6px 0;">
        <span class="loan-details-label" style="${labelStyle}">Kuvaus:</span>
        <span class="loan-details-value" style="${valueStyle}">${description}</span>
      </div>
      ` : ''}
    </div>
  `;
}

export function renderButton(href: string, label: string): string {
  const style =
    'display: inline-block; padding: 12px 22px; background-color: #221E5D; color: #ffffff; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 600;';
  return `<a href="${href}" class="button" style="${style}">${label}</a>`;
}

function renderFooter(): string {
  return `
    <div class="footer">
      <p><i>Tämä on automaattinen viesti. Älä vastaa tähän viestiin.</i></p>
      <p>Klapi – kaluston lainausjärjestelmä</p>
    </div>
  `;
}

export function renderEmail(innerHtml: string): string {
  return `
    <!DOCTYPE html>
    <html lang="fi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
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

/**
 * "3 päivää" / "yhden päivän" — the duration half of a "… myöhässä" phrase.
 * Finnish takes the genitive singular for one and the partitive for the rest.
 */
export function finnishDays(days: number): string {
  return days === 1 ? 'yhden päivän' : `${days} päivää`;
}

/** "1 laina" / "3 lainaa" — numeral + the case Finnish wants after it. */
export function finnishLoanCount(count: number): string {
  return count === 1 ? '1 laina' : `${count} lainaa`;
}
