// lib/parseMessages.js
//
// PURE port of Threads.jsx:67-149 (the metadata→productList parser).
//
// React's version MUTATED `message.productList = ...` (Threads.jsx:144) while
// accumulating `allProductList` across the `.map`. This port is pure: it returns
// NEW message objects ({...message, productList}) and never mutates the input.
//
// One deliberate divergence from React (per plan §L0.2 + risk R4): React
// concatenated `img_list_*` keys in `Object.keys` order (Threads.jsx:104-105),
// which is backend-key-order-dependent and can silently misalign image↔name. We
// sort `img_list_N` keys NUMERICALLY before concatenating so image[i] pairs with
// id/name/price/rating/reviewCount[i] regardless of metadata key order.
//
// Everything else is carried verbatim: the filtering_condition JSON.parse (last
// one wins), the filter_products vs get_product_details branches, and
// allProductList filtered to type === 'product'.

// Sort 'img_list_N' keys by their trailing numeric index (img_list_1, img_list_2, ...).
// Non-numeric / NaN suffixes sort to the end stably.
function sortedImgListKeys(metadataKeys) {
  return metadataKeys
    .filter((key) => key.startsWith('img_list_'))
    .sort((a, b) => {
      const na = Number(a.slice('img_list_'.length));
      const nb = Number(b.slice('img_list_'.length));
      return na - nb;
    });
}

/**
 * @param {object} currentMessages - the canonical store frame, shaped
 *   `{ data: { data: [ {id, role, content, metadata, ...}, ... ] } }`, NEWEST-FIRST.
 * @returns {{ messageList: object[], filteringCondition: any, allProductList: object[] }}
 *   messageList is OLDEST-FIRST (reversed), each message a NEW object carrying
 *   `productList`. allProductList accumulates only `type === 'product'` items.
 */
export function parseMessages(currentMessages) {
  // Threads.jsx:67 — copy the newest-first array and reverse to oldest-first.
  const sourceList = [...currentMessages.data.data].reverse();

  let filteringCondition; // Threads.jsx:68 — last message with one wins.
  let allProductList = []; // Threads.jsx:31 — accumulated across messages.

  const messageList = sourceList.map((message) => {
    let productList = [];
    const metadata = message.metadata;

    // Threads.jsx:75 — if the metadata is not empty.
    if (Object.keys(metadata).length !== 0) {
      // Threads.jsx:78-80 — capture filtering_condition (the last one wins).
      if (metadata.filtering_condition) {
        filteringCondition = JSON.parse(metadata.filtering_condition);
      }

      const metadataKey = Object.keys(metadata);

      let idList = [];
      let nameList = [];
      let imageUrlList = [];
      let priceList = [];
      let ratingList = [];
      let reviewCountList = [];

      // Non-img_list scalar lists (Threads.jsx:95-119).
      for (const key of metadataKey) {
        if (key === 'product_id_list') {
          idList = JSON.parse(metadata[key]);
        }

        if (key === 'product_name_list') {
          nameList = JSON.parse(metadata[key]);
        }

        if (key === 'product_price_list') {
          priceList = JSON.parse(metadata[key]);
        }

        if (key === 'product_rating_list') {
          ratingList = JSON.parse(metadata[key]);
        }

        if (key === 'product_review_count_list') {
          reviewCountList = JSON.parse(metadata[key]);
        }
      }

      // img_list_* concatenated in NUMERIC key order (divergence per R4; React
      // used Object.keys order at Threads.jsx:104-105).
      for (const key of sortedImgListKeys(metadataKey)) {
        imageUrlList = [...imageUrlList, ...JSON.parse(metadata[key])];
      }

      // Threads.jsx:122-134 — filter_products: full product objects.
      if (metadata.tool_call_name === 'filter_products') {
        productList = imageUrlList.map((image, index) => {
          return {
            image: image,
            id: idList[index],
            name: nameList[index],
            price: priceList[index],
            rating: ratingList[index],
            reviewCount: reviewCountList[index],
            type: 'product',
          };
        });
      }

      // Threads.jsx:137-141 — get_product_details: image only.
      if (metadata.tool_call_name === 'get_product_details') {
        productList = imageUrlList.map((image) => {
          return { image: image, type: 'productDetail' };
        });
      }

      // Threads.jsx:145-147 — accumulate, keeping only type === 'product'.
      let newProductImageList = [...allProductList, ...productList];
      newProductImageList = newProductImageList.filter((image) => {
        return image.type === 'product';
      });
      allProductList = newProductImageList;
    }

    // Pure: return a NEW message object instead of mutating (React: Threads.jsx:144).
    return { ...message, productList };
  });

  return { messageList, filteringCondition, allProductList };
}
