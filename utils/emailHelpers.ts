import { getCompressedImageUrl } from './imageHelpers';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fi-FI', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fi-FI', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Helsinki',
  });
}

export function getEmailStyles(): string {
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
        color: #2563eb;
        font-size: 24px;
        margin-top: 0;
        margin-bottom: 20px;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 10px;
      }
      h2 {
        color: #1e40af;
        font-size: 18px;
        margin-top: 25px;
        margin-bottom: 15px;
      }
      .info-box {
        background-color: #f9fafb;
        border-left: 4px solid #2563eb;
        padding: 15px;
        margin: 15px 0;
        border-radius: 4px;
      }
      .item-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 15px;
        margin: 20px 0;
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
        margin-bottom: 4px;
        color: #111827;
      }
      .item-amount {
        font-size: 12px;
        color: #6b7280;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #2563eb;
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        margin: 20px 0;
        font-weight: 600;
      }
      .button:hover {
        background-color: #1e40af;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        font-size: 12px;
        color: #6b7280;
        text-align: center;
      }
      .loan-details {
        background-color: #f9fafb;
        padding: 15px;
        border-radius: 6px;
        margin: 15px 0;
      }
      .loan-details-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
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
