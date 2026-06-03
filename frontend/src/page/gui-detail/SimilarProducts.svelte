<script>
  // page/gui-detail/SimilarProducts.svelte — L6.2. Faithful port of
  // GuiProductDetail.jsx SimilarProducts (258-285). Renders nothing when the list is
  // empty (React `if (!similarProducts.length) return;`). ProductCard gets
  // forSimilarProducts={true} (drives its mb-0 vs mb-20 — safelisted, R8).
  import ProductCard from '../../components/gui/ProductCard.svelte'

  let { similarProducts } = $props()
</script>

{#if similarProducts.length}
  <div class="flex flex-col text-primary font-nunito overflow-clip">
    <h3 class="text-xl font-extrabold mb-6">Similar products</h3>
    <div class="flex flex-row lg:flex-nowrap flex-wrap justify-center items-center px-20 gap-y-12">
      {#each similarProducts as product, index (index)}
        <ProductCard
          productId={product.productId}
          productName={product.productName}
          productPrice={product.productPrice}
          productRating={product.productRating}
          productReviewCount={product.productReviewCount}
          productImageList={product.productImageList}
          forSimilarProducts={true}
        />
      {/each}
    </div>
  </div>
{/if}
