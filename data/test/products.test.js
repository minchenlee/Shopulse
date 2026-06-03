import { describe, it, expect, beforeAll } from 'vitest';
import 'dotenv/config';
import '../src/nodeShim.js';
import { makeClient } from '../src/supabaseClient.js';
import { searchProducts, getProductDetails, getProductReviews } from '../src/products.js';

const supabase = makeClient();

describe('searchProducts (requires seeded DB)', () => {
  it('returns oled TVs', async () => {
    const rows = await searchProducts(supabase, { keyword: 'oled', limit: 3 });
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(3);
  });

  it('respects price range', async () => {
    const rows = await searchProducts(supabase, { keyword: 'tv', maxPrice: 500, limit: 10 });
    for (const r of rows) expect(Number(r.productPrice)).toBeLessThanOrEqual(500);
  });

  it('screen_type filter returns only oled rows', async () => {
    const rows = await searchProducts(supabase, { keyword: 'tv', screenType: 'oled', limit: 10 });
    for (const r of rows) {
      const tech = `${r.productSpec?.['Display Technology'] ?? ''} ${r.productSpec?.['Television Type'] ?? ''}`.toLowerCase();
      expect(tech).toContain('oled');
    }
  });
});

describe('getProductDetails / getProductReviews', () => {
  let id;
  beforeAll(async () => {
    const { data } = await supabase.from('products').select('id').limit(1).single();
    id = data.id;
  });
  it('details excludes review when asked', async () => {
    const d = await getProductDetails(supabase, id, { excludeReview: true });
    expect(d.productName).toBeDefined();
    expect(d.productReview).toBeUndefined();
  });
  it('details includes review by default', async () => {
    const d = await getProductDetails(supabase, id);
    expect(d.productReview).toBeDefined();
  });
  it('reviews returns a review summary', async () => {
    const r = await getProductReviews(supabase, id);
    expect(r.productName).toBeDefined();
    expect(r.productReview).toBeDefined();
  });
});
