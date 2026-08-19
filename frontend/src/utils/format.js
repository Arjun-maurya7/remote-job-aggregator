/**
 * Formatting Utility Functions
 */

/**
 * Decode HTML entities like &amp;, &lt;, &gt;, &quot;, &#039; into readable text.
 */
export function decodeHTMLEntities(text) {
  if (!text) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Format ISO date string into clean date (e.g., "19 Aug 2026").
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format salary fields cleanly (e.g., "$75,000 – $85,000 / year").
 */
export function formatSalary(job) {
  if (!job) return 'Salary not listed';

  const min = job.salary_min;
  const max = job.salary_max;

  if (min != null && max != null) {
    const currency = job.salary_currency === 'USD' ? '$' : (job.salary_currency || '$');
    const period = job.salary_period ? ` / ${job.salary_period.toLowerCase()}` : ' / year';
    return `${currency}${Number(min).toLocaleString()} – ${currency}${Number(max).toLocaleString()}${period}`;
  }

  if (min != null) {
    const currency = job.salary_currency === 'USD' ? '$' : (job.salary_currency || '$');
    const period = job.salary_period ? ` / ${job.salary_period.toLowerCase()}` : ' / year';
    return `From ${currency}${Number(min).toLocaleString()}${period}`;
  }

  return 'Salary not listed';
}

/**
 * Clean HTML excerpt to plain text preview.
 */
export function cleanExcerpt(text, maxLength = 175) {
  if (!text) return 'No summary preview available for this position.';
  const plainText = decodeHTMLEntities(text.replace(/<[^>]*>?/gm, '').trim());
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength).trim() + '...';
}

/**
 * Deterministic Linear/Vercel style avatar palette generator for company logos.
 */
export function getCompanyAvatarStyle(name = '') {
  const palettes = [
    { bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#3730a3', border: 'rgba(99, 102, 241, 0.25)' }, // Indigo
    { bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', color: '#0369a1', border: 'rgba(14, 165, 233, 0.25)' }, // Sky
    { bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', color: '#15803d', border: 'rgba(34, 197, 94, 0.25)' }, // Emerald
    { bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', color: '#6b21a8', border: 'rgba(168, 85, 247, 0.25)' }, // Purple
    { bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#b45309', border: 'rgba(245, 158, 11, 0.25)' }, // Amber
    { bg: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)', color: '#be123c', border: 'rgba(244, 63, 94, 0.25)' }, // Rose
    { bg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', color: '#334155', border: 'rgba(148, 163, 184, 0.3)' }, // Slate
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}
