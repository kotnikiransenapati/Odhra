/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Allows only safe tags and attributes for product descriptions.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'a', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'hr', 'sub', 'sup',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
  span: new Set(['class']),
  div: new Set(['class']),
  p: new Set(['class']),
};

const DANGEROUS_ATTRS = /^on|javascript:|data:/i;
const DANGEROUS_PROTOCOLS = /^(javascript|vbscript|data):/i;

/**
 * Sanitizes an HTML string, removing dangerous tags, attributes, and protocols.
 * This is a lightweight sanitizer suitable for product descriptions.
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  function cleanNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(true);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const el = node as Element;
    const tagName = el.tagName.toLowerCase();

    // Remove disallowed tags but keep their text content
    if (!ALLOWED_TAGS.has(tagName)) {
      const fragment = document.createDocumentFragment();
      Array.from(el.childNodes).forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) fragment.appendChild(cleaned);
      });
      return fragment;
    }

    // Create clean element
    const clean = document.createElement(tagName);
    const allowedForTag = ALLOWED_ATTRS[tagName] || new Set();

    // Copy only allowed attributes
    Array.from(el.attributes).forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      if (DANGEROUS_ATTRS.test(attrName)) return;
      if (!allowedForTag.has(attrName)) return;

      let value = attr.value;

      // Check for dangerous protocols in href/src
      if ((attrName === 'href' || attrName === 'src') && DANGEROUS_PROTOCOLS.test(value.trim())) {
        return;
      }

      // Force external links to open safely
      if (attrName === 'href' && tagName === 'a') {
        clean.setAttribute('rel', 'noopener noreferrer');
        clean.setAttribute('target', '_blank');
      }

      clean.setAttribute(attrName, value);
    });

    // Recursively clean children
    Array.from(el.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) clean.appendChild(cleaned);
    });

    return clean;
  }

  const fragment = document.createDocumentFragment();
  Array.from(doc.body.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) fragment.appendChild(cleaned);
  });

  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
}

/**
 * Strips all HTML tags, returning plain text only.
 */
export function stripHTML(html: string): string {
  if (!html || typeof html !== 'string') return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
