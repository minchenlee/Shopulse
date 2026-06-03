import { describe, it, expect } from 'vitest';
import { parseScreenSize, parseRefreshRate, classifyResolution, classifyScreenType, parseMaybeJson } from '../src/normalize.js';

describe('parseScreenSize', () => {
  it('handles inch-mark strings', () => expect(parseScreenSize('48"')).toBe(48));
  it('handles "Inches" strings', () => expect(parseScreenSize('65 Inches')).toBe(65));
  it('handles decimals', () => expect(parseScreenSize('48.5"')).toBe(48.5));
  it('returns null on garbage', () => expect(parseScreenSize('N/A')).toBeNull());
  it('returns null on undefined', () => expect(parseScreenSize(undefined)).toBeNull());
});

describe('parseRefreshRate', () => {
  it('extracts Hz number', () => expect(parseRefreshRate('120 Hz')).toBe(120));
  it('returns null when absent', () => expect(parseRefreshRate('')).toBeNull());
});

describe('classifyResolution', () => {
  it('maps 4K (2160P)', () => expect(classifyResolution('4K (2160P)')).toBe('4k'));
  it('maps 8K', () => expect(classifyResolution('8K')).toBe('8k'));
  it('maps 1080p/FHD', () => expect(classifyResolution('Full HD 1080p')).toBe('1080p'));
  it('returns null on unknown', () => expect(classifyResolution('Quantum')).toBeNull());
});

describe('classifyScreenType', () => {
  it('prefers oled', () => expect(classifyScreenType('OLED', '', '')).toBe('oled'));
  it('detects qled in spec', () => expect(classifyScreenType('', 'QLED TV', '')).toBe('qled'));
  it('detects qled in product name when spec says LED', () =>
    expect(classifyScreenType('LED', 'LED TVs', 'Hisense 55U8H QLED U8H Series')).toBe('qled'));
  it('treats ULED as qled (Hisense branding)', () =>
    expect(classifyScreenType('Full Array', 'LED TVs', 'Hisense U6 Series ULED 4K')).toBe('qled'));
  it('defaults to led when nothing matches but tech present', () =>
    expect(classifyScreenType('LED', 'Smart TV', 'Some LED TV')).toBe('led'));
  it('returns null when nothing present', () => expect(classifyScreenType('', '', '')).toBeNull());
});

describe('parseMaybeJson', () => {
  it('parses a JSON string', () => expect(parseMaybeJson('{"a":1}')).toEqual({ a: 1 }));
  it('passes through an object (sample.json form)', () => expect(parseMaybeJson({ a: 1 })).toEqual({ a: 1 }));
  it('returns null for null', () => expect(parseMaybeJson(null)).toBeNull());
});
