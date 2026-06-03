import 'dotenv/config';
import '../src/nodeShim.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeClient } from '../src/supabaseClient.js';
import {
  parseScreenSize, parseRefreshRate, classifyResolution, classifyScreenType, parseMaybeJson,
} from '../src/normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE = join(__dirname, '..', '..', 'backend', 'sample.json');

function toRow(doc) {
  const spec = doc.productSpec || {};
  const shortSpec = doc.productShortSpec || {};
  const sizeRaw = spec['Screen Size'] || shortSpec['Screen Size'];
  const resRaw = spec['Resolution'] || spec['Display Resolution'] || shortSpec['Resolution'];
  const screenType = classifyScreenType(spec['Display Technology'], spec['Television Type'], doc.productName);
  const resolution = classifyResolution(resRaw);

  const fallthroughs = [];
  if (resRaw && !resolution) fallthroughs.push(`resolution unclassified: "${resRaw}"`);
  if ((spec['Display Technology'] || spec['Television Type']) && screenType === 'led')
    fallthroughs.push(`screen_type defaulted to led: "${spec['Display Technology']}" / "${spec['Television Type']}"`);

  return {
    row: {
      amazon_url: doc.amazonUrl,
      model_code: doc.productModelCode,
      name: doc.productName,
      price: doc.productPrice ?? null,
      brand: spec['Brand'] ?? null,
      resolution,
      screen_type: screenType,
      refresh_rate: parseRefreshRate(spec['Refresh Rate']),
      screen_size_in: parseScreenSize(sizeRaw),
      rating: doc.productReview?.rating ?? null,
      review_count: doc.productReview?.reviewCount ?? 0,
      short_spec: shortSpec,
      spec,
      features: parseMaybeJson(doc.productFeatures),
      detail: parseMaybeJson(doc.productDetail),
      image_list: doc.productImageList ?? [],
      rating_distribution: doc.productReview?.ratingDistributionList ?? [],
    },
    reviews: (doc.productReview?.reviewList ?? []).map((r) => ({
      user_name: r.userName, title: r.reviewTitle, review_date: r.reviewDate,
      rating: r.rating != null ? parseFloat(r.rating) : null, body: r.review,
    })),
    fallthroughs: { name: doc.productName, issues: fallthroughs },
  };
}

async function main() {
  const supabase = makeClient();
  const data = JSON.parse(readFileSync(SAMPLE, 'utf8'));
  const docs = Object.values(data);
  console.log(`loading ${docs.length} products`);

  const allFallthroughs = [];
  for (const doc of docs) {
    const { row, reviews, fallthroughs } = toRow(doc);
    if (fallthroughs.issues.length) allFallthroughs.push(fallthroughs);

    const { data: up, error } = await supabase
      .from('products').upsert(row, { onConflict: 'amazon_url' }).select('id').single();
    if (error) { console.error('product upsert failed:', row.amazon_url, error.message); continue; }

    // replace reviews for idempotency
    await supabase.from('reviews').delete().eq('product_id', up.id);
    if (reviews.length) {
      const withId = reviews.map((r) => ({ ...r, product_id: up.id }));
      const { error: rErr } = await supabase.from('reviews').insert(withId);
      if (rErr) console.error('reviews insert failed:', row.amazon_url, rErr.message);
    }
  }

  console.log(`\n--- classifier fallthroughs (${allFallthroughs.length} products) ---`);
  for (const f of allFallthroughs) console.log(`  ${f.name}:\n    - ${f.issues.join('\n    - ')}`);

  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`\nproducts in DB: ${count}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
