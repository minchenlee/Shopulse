// lib/markdown.js
//
// L4.2 — markdown render + sanitize (decision D3: marked + DOMPurify).
//
// React used react-markdown, which parses to a React tree (never raw HTML) and
// is XSS-safe by construction. The Svelte port renders to an HTML string via
// `marked` and injects it with `{@html}`, so it MUST be sanitized — `marked`
// does NOT sanitize. DOMPurify is the standard pass (spec §4.4 "sanitize all
// rendered markdown").
//
// Per-tag Tailwind class parity (decision D4) is NOT done here — `marked` has no
// per-tag class API. It's reproduced in scoped `.markdown-modal` / `.markdown`
// CSS on the {@html} wrapper element (see src/index.css), mirroring the exact
// classes react-markdown's custom renderers injected (h3/p/ol/code in the
// modals).
//
// `breaks:true` + `gfm:true` keep the soft-newline behaviour the modal content
// relies on (the Welcome.json strings use literal `\n` between numbered lines).
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(text) {
  if (text == null) return '';
  const html = marked.parse(String(text));
  return DOMPurify.sanitize(html);
}
