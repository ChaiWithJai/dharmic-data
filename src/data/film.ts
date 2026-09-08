export function filmSettings(raw: string | undefined, privateReview = false) {
  if (privateReview) return { url: '/review-media/founder-film.mp4', review: true };
  if (!raw?.trim()) return { url: null, review: false };
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new Error('PUBLIC_FOUNDER_FILM_URL must be an approved HTTPS video URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hostname === 'localhost' || url.hostname.endsWith('.local') || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(url.hostname)) throw new Error('PUBLIC_FOUNDER_FILM_URL must be a public HTTPS URL');
  return { url: url.href, review: false };
}
