/**
 * Get the base URL for the application.
 * In development: uses localhost
 * In production: uses Vercel's VERCEL_URL environment variable
 *
 * Only a fallback for getPublicUrl() — nothing calls the app over HTTP from
 * inside itself any more, so this is deliberately not exported.
 */
function getBaseUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // In production, Vercel automatically sets VERCEL_URL (without https://)
  // NEXT_PUBLIC_VERCEL_URL is for client-side and may not be set
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  // Fallback to NEXT_PUBLIC_VERCEL_URL if VERCEL_URL is not available
  const publicUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (publicUrl) {
    return publicUrl.startsWith('http') ? publicUrl : `https://${publicUrl}`;
  }

  // Last resort fallback
  throw new Error('Unable to determine base URL. Please set VERCEL_URL or NEXT_PUBLIC_VERCEL_URL');
}

/**
 * Get the public-facing base URL for links in emails and client-side.
 * This should be used for URLs that users will click on.
 */
export function getPublicUrl(): string {
  // For public URLs, prefer NEXT_PUBLIC_VERCEL_URL if it's explicitly set
  const publicUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (publicUrl) {
    return publicUrl.startsWith('http') ? publicUrl : `https://${publicUrl}`;
  }

  // Otherwise fall back to base URL logic
  return getBaseUrl();
}
