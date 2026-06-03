<script>
  // page/gui-detail/Summary.svelte — L6.2. Faithful port of GuiProductDetail.jsx
  // Summary (145-178) plus its only-used-here children Rating (181-202), ShortSpec
  // (205-228) and Features (231-255), inlined.
  //
  // Rating: React hardcoded <Star/><Star/><Star/><Star/><HollowStar/> (4 filled, 1
  // hollow — a STATIC display, NOT derived from the rating value). Star.svelte is the
  // StarRow component (`i <= rating` filled); passing rating={4} reproduces exactly
  // four filled + one hollow, identical pixels. (The separate Star/HollowStar named
  // exports don't exist in the Svelte port — see Star.svelte's note — so this is the
  // faithful equivalent of the hardcoded row.)
  import StarRow from '../../components/gui/Star.svelte'

  let { productData } = $props()

  // Summary:152-159 — destructure. ShortSpec/Features title lists computed in markup.
  const productName = productData?.productName
  const productReview = productData?.productReview
  const productPrice = productData?.productPrice
  const productShortSpec = productData?.productShortSpec
  const productFeatures = productData?.productFeatures
</script>

{#if productData}
  <div class="me-24 flex flex-col space-y-10 font-nunito text-primary">
    <div class="flex flex-col space-y-4">
      <h1 class="text-lg font-semibold">{productName}</h1>
      <!-- Rating (181-202): static 4-filled-1-hollow row + the numeric rating/count. -->
      <div class="flex flex-row">
        <div class="flex flex-row items-center">
          <StarRow rating={4} />
        </div>
        <div class="ms-4">
          {productReview.rating}
        </div>
        <div class="ms-4">
          {productReview.reviewCount} ratings
        </div>
      </div>
      <h2 class="text-xl font-extrabold">${productPrice}</h2>
      <button class="w-[180px] py-2 bg-secondary text-lg font-extrabold rounded-full border-primary border-[1px] hover:shadow-md hover:scale-105 duration-300">
        Add to cart
      </button>
    </div>

    <!-- ShortSpec (205-228) -->
    <div class="flex flex-col">
      <h3 class="text-lg font-extrabold mb-4">At a glance</h3>
      <ul class="w-full">
        {#each Object.keys(productShortSpec) as specTitle, index (index)}
          <li class="text-md mb-4 flex flex-row">
            <span class="w-1/4 font-bold">
              {specTitle}
            </span>
            <span class="w-3/4 ps-2">
              {productShortSpec[specTitle]}
            </span>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Features (231-255) -->
    <div class="flex flex-col">
      <h3 class="text-lg font-extrabold mb-4">About this item</h3>
      <ul class="list-disc pl-5">
        {#each Object.keys(productFeatures) as featureTitle, index (index)}
          <li class="text-md mb-4">
            <span class="font-bold">
              {featureTitle}
            </span>
            <span class="">
              : {productFeatures[featureTitle]}
            </span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}
