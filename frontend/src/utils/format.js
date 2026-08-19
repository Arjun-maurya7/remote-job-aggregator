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
 * Format salary fields cleanly (e.g., "USD 75,000 – USD 85,000 / year").
 */
export function formatSalary(job) {
  if (!job) return 'Salary not listed';

  const min = job.salary_min;
  const max = job.salary_max;

  if (min != null && max != null) {
    const currency = job.salary_currency || 'USD';
    const period = job.salary_period ? ` / ${job.salary_period.toLowerCase()}` : ' / year';
    return `${currency} ${Number(min).toLocaleString()} – ${currency} ${Number(max).toLocaleString()}${period}`;
  }

  if (min != null) {
    const currency = job.salary_currency || 'USD';
    const period = job.salary_period ? ` / ${job.salary_period.toLowerCase()}` : ' / year';
    return `From ${currency} ${Number(min).toLocaleString()}${period}`;
  }

  return 'Salary not listed';
}

/**
 * Clean HTML excerpt to plain text preview.
 */
export function cleanExcerpt(text, maxLength = 180) {
  if (!text) return 'No summary preview available for this job position.';
  const plainText = decodeHTMLEntities(text.replace(/<[^>]*>?/gm, '').trim());
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength).trim() + '...';
}
