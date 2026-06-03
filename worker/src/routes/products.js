import { Hono } from 'hono';
import { searchProducts, getProductDetails, getProductReviews } from 'shopulse-data/src/products.js';
import { supa } from '../env.js';

export const products = new Hono();

products.get('/search', async (c) => {
  const q = c.req.query();
  if (!q.keyword) return c.json({ error: 'Missing parameter: keyword is required.' }, 400);
  return c.json(await searchProducts(supa(c.env), q));
});

products.get('/filter', async (c) => c.json(await searchProducts(supa(c.env), c.req.query())));

products.get('/:productId', async (c) => {
  const excludeReview = c.req.query('excludeReview') === 'true';
  const d = await getProductDetails(supa(c.env), c.req.param('productId'), { excludeReview });
  return d ? c.json(d) : c.json({ error: 'Not Found: Product does not exist' }, 404);
});

products.get('/:productId/reviews', async (c) => {
  const r = await getProductReviews(supa(c.env), c.req.param('productId'));
  return r ? c.json(r) : c.json({ error: 'Not Found: Product does not exist' }, 404);
});
