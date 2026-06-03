// lib/parseMessages.test.js — golden tests for the pure metadata parser (plan §4.1, risk R4).
//
// Frames use the CANONICAL store shape (Verified-fact 2 / R2):
//   currentMessages.data.data = [ {id, role, content:[{type:'text',text:{value}}], metadata, ...}, ... ]
// NEWEST-FIRST. parseMessages reverses it to oldest-first and pairs metadata lists.
//
// metadata.*_list values are JSON STRINGS (as the backend emits them) — the parser JSON.parse's them.

import { describe, it, expect } from 'vitest';
import { parseMessages } from './parseMessages.js';

// Helper: build a newest-first store frame from an array of message objects (oldest-first input,
// reversed here so the frame is newest-first like the real backend).
function frame(messagesOldestFirst) {
  return { data: { data: [...messagesOldestFirst].reverse() } };
}

// Helper: a text message envelope with a metadata blob.
function msg(role, text, metadata = {}) {
  return {
    id: `msg_${Math.random().toString(36).slice(2)}`,
    role,
    content: [{ type: 'text', text: { value: text } }],
    metadata,
    created_at: 1709461065,
  };
}

describe('parseMessages — filter_products frame', () => {
  it('pairs image↔id↔name↔price↔rating↔reviewCount by index into N product objects', () => {
    const metadata = {
      tool_call_name: 'filter_products',
      product_id_list: JSON.stringify(['id-A', 'id-B', 'id-C']),
      product_name_list: JSON.stringify(['TV A', 'TV B', 'TV C']),
      img_list_1: JSON.stringify(['img-A', 'img-B', 'img-C']),
      product_price_list: JSON.stringify([100, 200, 300]),
      product_rating_list: JSON.stringify([4.1, 4.2, 4.3]),
      product_review_count_list: JSON.stringify([11, 22, 33]),
    };
    const cm = frame([msg('user', 'show me TVs'), msg('assistant', 'here you go', metadata)]);

    const { messageList, allProductList } = parseMessages(cm);

    // messageList is oldest-first: [user, assistant].
    const assistant = messageList[1];
    expect(assistant.productList).toHaveLength(3);
    expect(assistant.productList[0]).toEqual({
      image: 'img-A', id: 'id-A', name: 'TV A', price: 100, rating: 4.1, reviewCount: 11, type: 'product',
    });
    expect(assistant.productList[1]).toEqual({
      image: 'img-B', id: 'id-B', name: 'TV B', price: 200, rating: 4.2, reviewCount: 22, type: 'product',
    });
    expect(assistant.productList[2]).toEqual({
      image: 'img-C', id: 'id-C', name: 'TV C', price: 300, rating: 4.3, reviewCount: 33, type: 'product',
    });

    // allProductList collects every type==='product' across messages.
    expect(allProductList).toHaveLength(3);
    expect(allProductList.map((p) => p.id)).toEqual(['id-A', 'id-B', 'id-C']);
  });

  it('parses filtering_condition from metadata (last one wins)', () => {
    const cond1 = { brand: ['LG'] };
    const cond2 = { brand: ['Samsung'], price: { min: 100 } };
    // Oldest-first input: m1 (older) then m2 (newer). Both carry a filtering_condition.
    const cm = frame([
      msg('assistant', 'a', { filtering_condition: JSON.stringify(cond1) }),
      msg('assistant', 'b', { filtering_condition: JSON.stringify(cond2) }),
    ]);

    const { filteringCondition } = parseMessages(cm);
    // messageList is oldest-first, so the newer message (cond2) is iterated last → wins.
    expect(filteringCondition).toEqual(cond2);
  });
});

describe('parseMessages — get_product_details frame', () => {
  it('produces {image, type:"productDetail"} entries and excludes them from allProductList', () => {
    const metadata = {
      tool_call_name: 'get_product_details',
      img_list_1: JSON.stringify(['detail-img-1', 'detail-img-2']),
    };
    const cm = frame([msg('assistant', 'details', metadata)]);

    const { messageList, allProductList } = parseMessages(cm);

    expect(messageList[0].productList).toEqual([
      { image: 'detail-img-1', type: 'productDetail' },
      { image: 'detail-img-2', type: 'productDetail' },
    ]);
    // productDetail items are NOT type==='product' → filtered out of allProductList.
    expect(allProductList).toEqual([]);
  });
});

describe('parseMessages — allProductList is only type==="product"', () => {
  it('aggregates products across messages but drops productDetail entries', () => {
    const productMeta = {
      tool_call_name: 'filter_products',
      product_id_list: JSON.stringify(['p1']),
      product_name_list: JSON.stringify(['Prod 1']),
      img_list_1: JSON.stringify(['p1-img']),
      product_price_list: JSON.stringify([10]),
      product_rating_list: JSON.stringify([5]),
      product_review_count_list: JSON.stringify([1]),
    };
    const detailMeta = {
      tool_call_name: 'get_product_details',
      img_list_1: JSON.stringify(['d-img']),
    };
    // Oldest-first: a filter_products message, then a get_product_details message.
    const cm = frame([msg('assistant', 'list', productMeta), msg('assistant', 'detail', detailMeta)]);

    const { allProductList } = parseMessages(cm);

    expect(allProductList).toHaveLength(1);
    expect(allProductList[0]).toEqual({
      image: 'p1-img', id: 'p1', name: 'Prod 1', price: 10, rating: 5, reviewCount: 1, type: 'product',
    });
  });
});

describe('parseMessages — img_list_N numeric sort (risk R4)', () => {
  it('concatenates img_list keys in NUMERIC order even when out-of-order in the object', () => {
    // img_list_2 appears BEFORE img_list_1 in key insertion order. Object.keys order would
    // mispair images with names; numeric sort fixes it.
    const metadata = {
      tool_call_name: 'filter_products',
      img_list_2: JSON.stringify(['img-3', 'img-4']),
      img_list_1: JSON.stringify(['img-1', 'img-2']),
      product_id_list: JSON.stringify(['id-1', 'id-2', 'id-3', 'id-4']),
      product_name_list: JSON.stringify(['N1', 'N2', 'N3', 'N4']),
      product_price_list: JSON.stringify([1, 2, 3, 4]),
      product_rating_list: JSON.stringify([1, 2, 3, 4]),
      product_review_count_list: JSON.stringify([1, 2, 3, 4]),
    };
    const cm = frame([msg('assistant', 'paged products', metadata)]);

    const { messageList } = parseMessages(cm);
    const products = messageList[0].productList;

    // Correct pairing requires img_list_1 (img-1, img-2) BEFORE img_list_2 (img-3, img-4).
    expect(products.map((p) => p.image)).toEqual(['img-1', 'img-2', 'img-3', 'img-4']);
    // Each image pairs with the same-index name/id.
    expect(products.map((p) => p.name)).toEqual(['N1', 'N2', 'N3', 'N4']);
    expect(products.map((p) => p.id)).toEqual(['id-1', 'id-2', 'id-3', 'id-4']);
  });
});

describe('parseMessages — purity (immutable out)', () => {
  it('does not mutate a deep-frozen input frame', () => {
    const metadata = {
      tool_call_name: 'filter_products',
      product_id_list: JSON.stringify(['id-A']),
      product_name_list: JSON.stringify(['TV A']),
      img_list_1: JSON.stringify(['img-A']),
      product_price_list: JSON.stringify([100]),
      product_rating_list: JSON.stringify([4.5]),
      product_review_count_list: JSON.stringify([9]),
    };
    const cm = frame([msg('assistant', 'frozen', metadata)]);

    // Deep-freeze the whole frame so any mutation (e.g. message.productList =) throws.
    deepFreeze(cm);

    expect(() => parseMessages(cm)).not.toThrow();

    const { messageList } = parseMessages(cm);
    // Source messages must NOT have gained a productList property.
    expect('productList' in cm.data.data[0]).toBe(false);
    // The returned message is a new object carrying productList.
    expect(messageList[0].productList).toHaveLength(1);
    expect(messageList[0]).not.toBe(cm.data.data[0]);
  });

  it('handles messages with empty metadata (no productList work, empty productList)', () => {
    const cm = frame([msg('user', 'hello', {}), msg('assistant', 'hi', {})]);
    deepFreeze(cm);

    const { messageList, allProductList, filteringCondition } = parseMessages(cm);
    expect(messageList.map((m) => m.productList)).toEqual([[], []]);
    expect(allProductList).toEqual([]);
    expect(filteringCondition).toBeUndefined();
  });
});

// Recursively freeze an object graph so any write throws in strict mode (vitest modules are strict).
function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = obj[prop];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  return Object.freeze(obj);
}
