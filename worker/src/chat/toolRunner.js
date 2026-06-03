import { searchProducts, getProductDetails, getProductReviews } from 'shopulse-data/src/products.js';

// Runs the Assistants tool calls by hitting the data/ functions DIRECTLY (no localhost HTTP).
// Mirrors backend/routes/chat.js callProductAPI(): filter_products -> searchProducts (limit 3,
// productShortSpec dropped), get_product_details -> getProductDetails (excludeReview, drop
// productShortSpec/productDetail), get_product_reviews -> getProductReviews (review body truncated
// to 850 chars). Returns raw, un-stripped outputs for splitToolResults() to fan out.
export async function runToolCalls(sb, toolCalls) {
  const results = [];
  for (const tc of toolCalls) {
    if (tc.type !== 'function') continue;
    const name = tc.function.name;
    const args = JSON.parse(tc.function.arguments);
    let output;

    if (name === 'filter_products') {
      output = await searchProducts(sb, { ...args, limit: 3 });
      output.forEach((p) => delete p.productShortSpec);
    } else if (name === 'get_product_details') {
      output = await getProductDetails(sb, args.productId, { excludeReview: true });
      if (output) {
        delete output.productShortSpec;
        delete output.productDetail;
      }
    } else if (name === 'get_product_reviews') {
      output = await getProductReviews(sb, args.productId);
      output?.productReview?.reviewList?.forEach((r) => {
        r.review = (r.review || '').substring(0, 850);
      });
    }

    // keep the filter args around: they ARE the filtering condition the old /products/filter
    // route echoed back (same param names), and Threads.jsx renders metadata.filtering_condition
    // even when a filter returns no products.
    results.push({ tool_call_id: tc.id, tool_call_name: name, output, args });
  }
  return results;
}

// Splits the raw tool results into:
//   (a) modelOutputs  -> what gets submitted to the Assistant (image URLs stripped so the model
//                        never echoes them; productReview collapsed to its reviewList).
//   (b) metadata      -> the flat blob reattached to the assistant message row; Threads.jsx parses
//                        these exact keys (img_list_N, product_*_list, filtering_condition,
//                        product_review, tool_call_name).
// Parity target: backend/routes/chat.js lines 354-531.
export function splitToolResults(rawResults) {
  const modelOutputs = [];
  let metadata = {};

  for (const r of rawResults) {
    const name = r.tool_call_name;
    const out = r.output;

    // (a) model-facing output: strip productImageList; collapse productReview -> reviewList.
    const modelOut = structuredClone(out);
    if (name === 'filter_products' && Array.isArray(modelOut)) {
      modelOut.forEach((p) => delete p.productImageList);
    } else if (modelOut) {
      delete modelOut.productImageList;
      if (modelOut.productReview) modelOut.productReview = modelOut.productReview.reviewList;
    }
    modelOutputs.push({ tool_call_id: r.tool_call_id, output: JSON.stringify(modelOut) });

    // (b) metadata reattach.
    if (name === 'filter_products' && Array.isArray(out)) {
      // The model-passed filter args ARE the filtering condition the old /products/filter route
      // echoed back. Threads.jsx (line 78) renders metadata.filtering_condition even on an empty
      // result, so emit it independent of whether any product had an image.
      metadata.filtering_condition = JSON.stringify(r.args ?? {});

      const productImageList = out.map((p) => p.productImageList?.[0]).filter(Boolean);
      if (productImageList.length > 0) {
        // tool_call_name is set ONLY when there are products — old chat.js (lines 434-443) left
        // it unset on an empty filter, so Threads.jsx:48 must NOT auto-open the hybrid buffer for
        // a no-result filter.
        metadata.tool_call_name = 'filter_products';
        chunkImages(metadata, productImageList);
        // product names capped at 70 chars (matches old substring(0, 70)).
        metadata.product_name_list = JSON.stringify(out.map((p) => (p.productName || '').slice(0, 70)));
        metadata.product_id_list = JSON.stringify(out.map((p) => p._id));
        metadata.product_price_list = JSON.stringify(out.map((p) => p.productPrice));
        metadata.product_rating_list = JSON.stringify(out.map((p) => p.productRating));
        metadata.product_review_count_list = JSON.stringify(out.map((p) => p.productReviewCount));
      }
    }

    if (name === 'get_product_details' && out) {
      const productImageList = out.productImageList || [];
      if (productImageList.length > 0) {
        chunkImages(metadata, productImageList);
        metadata.tool_call_name = 'get_product_details';
        metadata.product_name_list = JSON.stringify([out.productName]);
      }
    }

    if (name === 'get_product_reviews' && out) {
      // get_product_reviews has its own branch: no images, just the review summary with reviewList
      // removed and each rating's id stripped.
      const review = { ...out.productReview };
      delete review.reviewList;
      review.ratingDistributionList = (review.ratingDistributionList || []).map(({ id, ...rest }) => rest);
      metadata.product_review = JSON.stringify(review);
      metadata.tool_call_name = 'get_product_reviews';
    }
  }

  return { modelOutputs, metadata };
}

// productImageList can be long; chunk into 5-per-key under img_list_1, img_list_2, ...
function chunkImages(metadata, imgs) {
  for (let i = 0; i < imgs.length; i += 5) {
    metadata[`img_list_${Math.floor(i / 5) + 1}`] = JSON.stringify(imgs.slice(i, i + 5));
  }
}
