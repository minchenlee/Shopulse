import { describe, it, expect } from 'vitest';
import { splitToolResults } from '../src/chat/toolRunner.js';

// Regression guard: the metadata blob splitToolResults builds is the exact contract
// Threads.jsx parses (img_list_N, product_*_list, filtering_condition, product_review,
// tool_call_name). filtering_condition in particular must survive even when a filter
// returns no products — that no-result branch was dropped once and is the bug this guards.

const filterResult = (products, args) => [{
  tool_call_id: 'tc1',
  tool_call_name: 'filter_products',
  args,
  output: products,
}];

describe('splitToolResults — filter_products', () => {
  it('emits filtering_condition + tool_call_name on a populated result', () => {
    const products = [
      { _id: 'a', productName: 'Sony OLED', productPrice: 999, productRating: 4.5, productReviewCount: 12, productImageList: ['i1', 'i2'] },
      { _id: 'b', productName: 'LG OLED', productPrice: 799, productRating: 4.2, productReviewCount: 8, productImageList: ['i3'] },
    ];
    const args = { screenType: 'oled', maxPrice: 1000 };
    const { metadata } = splitToolResults(filterResult(products, args));

    expect(metadata.tool_call_name).toBe('filter_products');
    expect(JSON.parse(metadata.filtering_condition)).toEqual(args);
    expect(JSON.parse(metadata.product_id_list)).toEqual(['a', 'b']);
    expect(JSON.parse(metadata.product_name_list)).toEqual(['Sony OLED', 'LG OLED']);
    expect(JSON.parse(metadata.product_price_list)).toEqual([999, 799]);
    expect(JSON.parse(metadata.img_list_1)).toEqual(['i1', 'i3']); // first image per product
  });

  it('STILL emits filtering_condition + tool_call_name when the filter returns no products', () => {
    const args = { brand: 'Nonexistent', minPrice: 99999 };
    const { metadata } = splitToolResults(filterResult([], args));

    // The no-result render in Threads.jsx keys off filtering_condition being present.
    expect(metadata.tool_call_name).toBe('filter_products');
    expect(JSON.parse(metadata.filtering_condition)).toEqual(args);
    // no products → no product lists / images
    expect(metadata.product_id_list).toBeUndefined();
    expect(metadata.img_list_1).toBeUndefined();
  });

  it('strips productImageList from model-facing output but keeps images in metadata', () => {
    const products = [{ _id: 'a', productName: 'X', productPrice: 1, productRating: 5, productReviewCount: 1, productImageList: ['keepme'] }];
    const { modelOutputs, metadata } = splitToolResults(filterResult(products, { screenType: 'qled' }));

    const modelOut = JSON.parse(modelOutputs[0].output);
    expect(modelOut[0].productImageList).toBeUndefined(); // model never sees image URLs
    expect(JSON.parse(metadata.img_list_1)).toEqual(['keepme']); // but metadata does
  });
});

describe('splitToolResults — get_product_reviews', () => {
  it('emits product_review with reviewList removed and rating ids stripped', () => {
    const raw = [{
      tool_call_id: 'tc2',
      tool_call_name: 'get_product_reviews',
      output: {
        productReview: {
          rating: 4.4,
          reviewCount: 30,
          ratingDistributionList: [{ id: 1, stars: 5, count: 20 }, { id: 2, stars: 4, count: 10 }],
          reviewList: [{ review: 'great' }],
        },
      },
    }];
    const { metadata } = splitToolResults(raw);
    const review = JSON.parse(metadata.product_review);
    expect(review.reviewList).toBeUndefined();
    expect(review.ratingDistributionList.every((r) => !('id' in r))).toBe(true);
    expect(metadata.tool_call_name).toBe('get_product_reviews');
  });
});
