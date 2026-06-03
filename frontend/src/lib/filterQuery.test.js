// lib/filterQuery.test.js
// L0.1 golden tests (vitest, node env per §4.1 / decision D8).
//
// These pin the FAITHFUL port of Gui.jsx's filter engine. Every expected value
// below was captured from executing the ported buildFilterUrl() so it reflects
// the React app's real behavior, INCLUDING its pre-existing quirks. The two
// load-bearing quirks the plan (§Verified-fact 4, R12) demands we lock down:
//   - the comma-operator returns (queryDict mutated by reference; only
//     isProcessed flows back) — proven by the "merge" case working at all.
//   - the space-encoding asymmetry — proven by the OFF-of-a-space-value case,
//     which DUPLICATES the value instead of removing it.
//
// Runs under environment:'node' (vite.config.js), so window is undefined and
// getPathname() returns '' — assertions are on the query portion, which is
// exactly what these golden cases target.

import { describe, it, expect } from 'vitest';
import { buildFilterUrl } from './filterQuery.js';

describe('buildFilterUrl — faithful filter-URL engine', () => {
  it('toggles a checkbox ON for a fresh key (no existing search)', () => {
    expect(buildFilterUrl('screenType', 'OLED', '')).toBe('?screenType=OLED');
  });

  it('toggles ON for a fresh key when search is just "?"', () => {
    // queryString = '?'.split('?')[1] === '' (falsy) -> takes the length===0 branch
    expect(buildFilterUrl('screenType', 'OLED', '?')).toBe('?screenType=OLED');
  });

  it('merges a SECOND value onto an existing key', () => {
    // Requires queryDict to be mutated BY REFERENCE inside mergeExistingKey
    // (the comma-operator return hands back only isProcessed) — this passing
    // proves the comma-operator quirk is preserved.
    expect(buildFilterUrl('screenType', 'QLED', '?screenType=OLED'))
      .toBe('?screenType=OLED,QLED');
  });

  it('toggles OFF the only value, emptying the query string', () => {
    // queryString becomes '' -> newUrl = getPathname() = '' (no window in node).
    expect(buildFilterUrl('screenType', 'OLED', '?screenType=OLED')).toBe('');
  });

  it('toggles OFF one value while leaving the other', () => {
    expect(buildFilterUrl('screenType', 'QLED', '?screenType=OLED,QLED'))
      .toBe('?screenType=OLED');
  });

  it('promotes a range (price) to min/max keys from a fresh search', () => {
    expect(buildFilterUrl('price', '100-500', '')).toBe('?minPrice=100&maxPrice=500');
  });

  it('promotes a range (price) alongside an existing non-range key', () => {
    expect(buildFilterUrl('price', '100-500', '?brand=LG'))
      .toBe('?brand=LG&minPrice=100&maxPrice=500');
  });

  it('promotes a range (screenSize) to min/max keys', () => {
    expect(buildFilterUrl('screenSize', '40-55', '')).toBe('?minScreenSize=40&maxScreenSize=55');
  });

  it('strips pagination on toggle — but leaves a trailing "&" (pre-existing quirk)', () => {
    // faithful port: pre-existing quirk — the /pagination=\d+&?/g regex removes
    // "pagination=3" but the "&" that PRECEDED it survives, leaving a dangling
    // ampersand. Carried verbatim; do NOT "fix" to "?screenType=OLED,QLED".
    expect(buildFilterUrl('screenType', 'QLED', '?screenType=OLED&pagination=3'))
      .toBe('?screenType=OLED,QLED&');
  });

  it('strips pagination when adding a fresh key to an existing search', () => {
    expect(buildFilterUrl('brand', 'Sony', '?screenType=OLED&pagination=2'))
      .toBe('?screenType=OLED&brand=Sony');
  });

  // --- The space-encoding asymmetry (§Verified-fact 4, the headline quirk) ---

  it('toggles ON a value containing a space (pushed RAW, un-encoded)', () => {
    // mergeExistingKey / fresh-add push the raw value — no %20 encoding here.
    expect(buildFilterUrl('brand', 'LG Electronics', '')).toBe('?brand=LG Electronics');
  });

  it('merges a space-containing value onto an existing key (raw)', () => {
    expect(buildFilterUrl('brand', 'LG Electronics', '?brand=Sony'))
      .toBe('?brand=Sony,LG Electronics');
  });

  it('toggle-OFF of a space value is NOT a removal — it DUPLICATES (the asymmetry)', () => {
    // faithful port: pre-existing quirk — removeExistingKeyValue encodes the
    // space to '%20' before matching ('LG%20Electronics'), so it never matches
    // the stored raw 'LG Electronics'. isProcessed stays false, control falls
    // through to mergeExistingKey, which appends ANOTHER raw copy. Toggling OFF
    // a space-containing value therefore duplicates it rather than removing it.
    // This pins the asymmetry so the port can't accidentally "fix" it.
    expect(buildFilterUrl('brand', 'LG Electronics', '?brand=LG Electronics'))
      .toBe('?brand=LG Electronics,LG Electronics');
  });
});
