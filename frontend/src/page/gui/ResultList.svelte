<script>
  // page/gui/ResultList.svelte — L6.1. Faithful port of Gui.jsx ResultList (280-305).
  // Reads productDataList off the store (React useUserSession) and renders the result
  // grid + PageSelector. The setProductDataList/setIsLoadingData props React passed to
  // PageSelector are gone — PageSelector reads the store / URL directly (L1.3 design).
  import ProductCard from '../../components/gui/ProductCard.svelte'
  import PageSelector from './PageSelector.svelte'
  import { session } from '../../lib/session.svelte.js'
</script>

<div class="flex flex-col items-center">
  <h2 class="w-full text-primary font-russoOne text-xl mb-4">Results</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-12">
    {#each session.productDataList as product (product._id)}
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
  <PageSelector productDataList={session.productDataList} />
</div>
