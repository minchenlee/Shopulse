<script>
  // L5.4 — the hybrid product buffer pane (Buffer.jsx:13-96 `Buffer`).
  //
  // React wrapped the default export in `memo(Buffer, isEqual)` (react-fast-compare);
  // per D11 that memoization is DROPPED. The inner components are split into siblings:
  //   FilterDisplay.svelte, ProductCard.svelte (+ its ConfirmToolTip), DemoProductCard.svelte.
  //
  // Owns: the de-dup-by-id list, the demo-mode branch, the lastThirdProductRef scroll
  // target, and the localStorage `deletedProductDict` ($state + guarded persist $effect).
  import { session } from '../../lib/session.svelte.js';
  // faithful port: pre-existing quirk — Buffer.jsx:7 imported { Image } but never used
  // it (a dead import, verified-fact #9). Carried verbatim; this is the reason
  // Carousel.svelte preserves the named `Image` export (L5.1). It is tree-shaken.
  // eslint-disable-next-line no-unused-vars
  import { Image } from '../Chat/Carousel.svelte';
  import BufferJSON from '../../dummy_data/buffer.json';
  import FilterDisplay from './FilterDisplay.svelte';
  import ProductCard from './ProductCard.svelte';
  import DemoProductCard from './DemoProductCard.svelte';

  let {
    productList = [],
    isBufferShown = false,
    filteringCondition = null,
  } = $props();

  // Buffer.jsx:14-17 — fall back to the demo product when no products yet.
  // Buffer.jsx:19-23 — de-dup by id, keeping the LAST occurrence (findIndex finds the
  // first; keeping index===firstIndex keeps the first match — carried verbatim).
  // NOTE quirk (carried): de-dup is by `product.id` while deletion (ProductCard) is by
  // `product.name` — the name-vs-id inconsistency (verified-fact #9 / D11).
  let products = $derived.by(() => {
    let list = productList;
    if (list.length === 0) {
      list = BufferJSON.productList;
    }
    return list.filter(
      (product, index, self) => index === self.findIndex((t) => t.id === product.id)
    );
  });

  // Buffer.jsx:25-28 — demo mode + the resolved filtering condition.
  let isDemoMode = $derived(products[0].id === 'demo');
  let productListLength = $derived(products.length);
  let resolvedFilteringCondition = $derived(filteringCondition || BufferJSON.filteringCondition);

  // Buffer.jsx:31 — the scroll target node for the "last third" auto-scroll.
  let lastThirdProductRef = $state(null);

  // Buffer.jsx:35-36 — read the deleted-product map from SHOPULSE localStorage.
  const storedShopulse = JSON.parse(window.localStorage.getItem('SHOPULSE')) || {};
  let deletedProductDict = $state(storedShopulse.deletedProductDict || {});

  // Buffer.jsx:40-52 — when the buffer is shown, scroll to the last-third product after
  // a 500ms delay (carried verbatim). React keyed [productList]; here the $effect reads
  // `products` + `isBufferShown` + the ref.
  $effect(() => {
    const _ = products; // re-run when the product list changes (React dep)
    if (isBufferShown) {
      const lastThird = lastThirdProductRef;
      if (lastThird) {
        setTimeout(() => {
          lastThird.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
      }
    }
  });

  // Buffer.jsx:57-62 — persist deletedProductDict back into the SHOPULSE blob.
  // R13: GUARD the first-mount write — only persist once there is at least one entry,
  // so an empty {} on mount never clobbers a stored map (React's
  // `Object.keys(...).length > 0` guard, carried).
  $effect(() => {
    if (Object.keys(deletedProductDict).length > 0) {
      const blob = JSON.parse(window.localStorage.getItem('SHOPULSE')) || {};
      blob.deletedProductDict = deletedProductDict;
      window.localStorage.setItem('SHOPULSE', JSON.stringify(blob));
    }
  });

  // setter handed to ProductCard so it can update the dict (React passed setdeletedProductDict).
  function setDeletedProductDict(next) {
    deletedProductDict = next;
  }

  // React held a single `lastThirdProductRef` useRef in Buffer and assigned it to the
  // ONE card where (productListLength - index === 3) (Buffer.jsx:158). Each ProductCard
  // decides if it's that card; if so it publishes its node through this setter. Cards
  // that aren't the last-third never call it (matching React's `ref={null}` for them).
  function setLastThirdProductRef(el) {
    lastThirdProductRef = el;
  }
</script>

{#if isDemoMode}
  <!-- Buffer.jsx:64-75 — demo-mode list. -->
  <div
    id="buffer"
    class="flex flex-col w-full h-full items-center overflow-y-scroll overflow-x-hidden space-y-4 2xl:px-12 px-4 pb-20 relative"
  >
    <FilterDisplay filteringCondition={resolvedFilteringCondition} {isBufferShown} />
    {#each products as product, index (index)}
      <DemoProductCard {product} />
    {/each}
  </div>
{:else}
  <!-- Buffer.jsx:77-95 — the live product list. -->
  <div
    id="buffer"
    class="flex flex-col w-full h-full items-center overflow-y-scroll overflow-x-hidden space-y-4 2xl:px-12 px-4 pb-20 relative"
  >
    <FilterDisplay filteringCondition={resolvedFilteringCondition} {isBufferShown} />
    {#each products as product, index (index)}
      <ProductCard
        {index}
        {product}
        {setLastThirdProductRef}
        {isBufferShown}
        {productListLength}
        {deletedProductDict}
        {setDeletedProductDict}
      />
    {/each}
  </div>
{/if}
