// Lightweight head manager for React 19 (no external deps)
// Usage:
//   const { setTitle, upsertMeta, setLink, setJsonLd } = useHead();
//   setTitle('My Title');
//   upsertMeta('name', 'description', 'My description');
//   setLink('canonical', 'https://example.com/page');
//   setJsonLd('ld-id', { /* schema.org JSON-LD */ });

export function useHead() {
  function setTitle(title) {
    if (typeof document !== 'undefined' && title) document.title = title;
  }

  function upsertMeta(attrName, attrValue, content) {
    if (typeof document === 'undefined') return;
    const sel = `meta[${attrName}="${attrValue}"]`;
    let el = document.head.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    if (content != null) el.setAttribute('content', content);
  }

  function setLink(rel, href) {
    if (typeof document === 'undefined' || !href) return;
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function setJsonLd(id, data) {
    if (typeof document === 'undefined' || !data) return;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    try {
      el.textContent = JSON.stringify(data);
    } catch (e) {
      // ignore JSON errors silently
    }
  }

  return { setTitle, upsertMeta, setLink, setJsonLd };
}
