/**
 * Universal Sales Chat Engine - Helpers & Utilities
 * Zero dependencies, pure modern JavaScript
 */

/**
 * Escapes HTML characters to prevent XSS injection
 * @param {string} str 
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses basic markdown (bold, italic, links, lists, code) safely into HTML
 * @param {string} text 
 * @returns {string}
 */
export function renderMarkdown(text) {
  if (!text) return '';
  let safe = escapeHtml(text);

  // Bold: **text** or __text__
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
  safe = safe.replace(/_(.*?)_/g, '<em>$1</em>');

  // Inline code: `code`
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Markdown links: [label](url) with XSS sanitization
  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, rawUrl) => {
    // Unescape any HTML entities from the URL for validation
    const unescapedUrl = rawUrl.replace(/&amp;/g, '&');
    const validUrl = sanitizeUrl(unescapedUrl);
    if (validUrl) {
      return `<a href="${escapeHtml(validUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
    return label;
  });

  // Convert line breaks and bullet points
  const lines = safe.split('\n');
  const processed = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        processed.push('<ul class="chat-list">');
        inList = true;
      }
      processed.push(`<li>${trimmed.substring(2)}</li>`);
    } else {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      if (trimmed.length > 0) {
        processed.push(`<p>${line}</p>`);
      }
    }
  }

  if (inList) {
    processed.push('</ul>');
  }

  return processed.join('');
}

/**
 * Interpolates variables in a string (e.g., {{userName}})
 * @param {string} template 
 * @param {Record<string, any>} context 
 * @returns {string}
 */
export function interpolate(template, context = {}) {
  if (typeof template !== 'string') return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return context[key] !== undefined && context[key] !== null ? context[key] : '';
  });
}

/**
 * Validates and sanitizes external and media URLs
 * Rejects javascript:, data:, vbscript: and malformed URIs.
 * Allows safe protocols: http:, https:, blob: and relative paths.
 * @param {string} url 
 * @returns {string|null}
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Explicitly block dangerous script protocols
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return null;
  }

  // Safe relative paths
  if (trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('assets/')) {
    return trimmed;
  }

  // Safe blob URLs (used for local voice recording previews)
  if (lower.startsWith('blob:')) {
    return trimmed;
  }

  // Absolute URLs must strictly be http or https
  try {
    const base = typeof window !== 'undefined' && window.location ? window.location.href : 'https://example.com/';
    const parsed = new URL(trimmed, base);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Formats seconds into MM:SS display string
 * @param {number} totalSeconds 
 * @returns {string}
 */
export function formatSecondsToTime(totalSeconds) {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Formats monetary amounts transparently
 * @param {number} amount 
 * @param {string} currency 
 * @param {string} symbol 
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'MXN', symbol = '$') {
  if (typeof amount !== 'number') return `${symbol}0.00 ${currency}`;
  const formatted = amount.toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted} ${currency}`;
}

/**
 * Extracts product slug from URL query (?product=slug or ?p=slug)
 * @param {string} defaultSlug 
 * @returns {string}
 */
export function getProductSlugFromUrl(defaultSlug = 'cocina-inteligente') {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('product') || params.get('p') || defaultSlug;
  } catch (e) {
    return defaultSlug;
  }
}

/**
 * Generates unique random IDs for nodes, products or sessions
 * @param {string} prefix 
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  const rand = Math.random().toString(36).substring(2, 9);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}

/**
 * Delays execution asynchronously
 * @param {number} ms 
 * @returns {Promise<void>}
 */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/**
 * Safely deep clones objects
 * @template T
 * @param {T} obj 
 * @returns {T}
 */
export function deepClone(obj) {
  if (obj === undefined || obj === null) return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Trigger file download in browser
 * @param {string} filename 
 * @param {string} content 
 * @param {string} mimeType 
 */
export function downloadFile(filename, content, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Extracts a query parameter safely from the current URL
 * @param {string} key 
 * @param {string|null} defaultVal 
 * @returns {string|null}
 */
export function getUrlParam(key, defaultVal = null) {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

/**
 * Builds a shareable campaign URL for a product, offer, or entry node
 * @param {{ product?: string, offer?: string, entry?: string, direct?: boolean, single?: boolean, nofs?: boolean }} options 
 * @returns {string}
 */
export function buildShareUrl(options = {}) {
  try {
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://example.com';
    let pathname = typeof window !== 'undefined' && window.location ? window.location.pathname : '/';

    // Replace admin.html with index.html if on admin page
    if (pathname.endsWith('admin.html')) {
      pathname = pathname.replace('admin.html', 'index.html');
    } else if (!pathname.endsWith('index.html') && !pathname.endsWith('/')) {
      pathname = pathname + '/index.html';
    } else if (pathname.endsWith('/')) {
      pathname = pathname + 'index.html';
    }

    const url = new URL(pathname, origin);
    if (options.product) url.searchParams.set('product', options.product);
    if (options.offer) url.searchParams.set('offer', options.offer);
    if (options.entry) url.searchParams.set('entry', options.entry);
    if (options.direct) url.searchParams.set('direct', 'true');
    if (options.single) url.searchParams.set('single', 'true');
    if (options.nofs) url.searchParams.set('nofs', 'true');
    return url.toString();
  } catch (e) {
    const prod = options.product ? `product=${options.product}` : '';
    const off = options.offer ? `&offer=${options.offer}` : '';
    const dir = options.direct ? '&direct=true' : '';
    const sgl = options.single ? '&single=true' : '';
    return `index.html?${prod}${off}${dir}${sgl}`;
  }
}
