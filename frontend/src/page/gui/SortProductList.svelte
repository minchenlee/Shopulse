<script>
  // page/gui/SortProductList.svelte — L6.1. Faithful port of Gui.jsx SortProductList
  // (240-277, memo dropped). Fetches its own 4-item product list on mount (the React
  // useEffect([]) → a one-shot $effect-with-guard) and renders ProductCards. Renders
  // nothing until the list is non-empty (React `if (length === 0) return;`).
  import ProductCard from '../../components/gui/ProductCard.svelte'
  import { fetchData } from '../../lib/api.js'

  let { title, query } = $props()

  let productDataList = $state([])

  // React used useEffect([]) (mount-once). A guarded $effect reproduces that without
  // re-firing: the empty-deps mount fetch.
  let fetched = false
  $effect(() => {
    if (fetched) return
    fetched = true
    ;(async () => {
      const data = await fetchData(`/products/filter?limit=4&fullDetails=false${query}`)
      productDataList = data
    })()
  })
</script>

{#if productDataList.length > 0}
  <div class="flex flex-col items-start">
    <h2 class="w-full text-primary font-russoOne text-xl">{title}</h2>
    <div class="flex flex-row items-center justify-center space-x-4 w-full 2xl:w-2/3">
      {#each productDataList as product (product._id)}
        <ProductCard
          productId={product._id}
          productImageList={product.productImageList}
          productName={product.productName}
          productPrice={product.productPrice}
          productRating={product.productRating}
          productReviewCount={product.productReviewCount}
        />
      {/each}
    </div>
  </div>
{/if}
