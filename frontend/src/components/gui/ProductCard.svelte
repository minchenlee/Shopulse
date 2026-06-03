<script>
  // L2.2 — port of gui/ProductCard.jsx. Links to the product detail route,
  // shows hero image / price / (truncated) name / rating.
  //
  // NOTE the React file imported `{ StarRow, Star, HollowStar }` but only used
  // StarRow (Star/HollowStar were dead — D11). Svelte can't expose those as named
  // exports of the Star component, so only StarRow is imported (the dead names are
  // structurally undroppable-in / unportable, see Star.svelte).
  import { Link } from 'svelte-routing'
  import StarRow from './Star.svelte'

  // React used positional `props.x || default` fallbacks (ProductCard.jsx:7-13).
  // $props() default values reproduce that for the undefined case; the explicit
  // `|| default` below also covers the falsy-but-defined case (e.g. price 0),
  // matching React's `||` exactly.
  let {
    productId: productIdProp,
    productImageList: productImageListProp,
    productName: productNameProp,
    productPrice: productPriceProp,
    productRating: productRatingProp,
    productReviewCount: productReviewCountProp,
    forSimilarProducts: forSimilarProductsProp,
  } = $props()

  const productId = $derived(productIdProp || '65fbe1900d011def30ca0a67')
  const productImageList = $derived(productImageListProp || [])
  const productPrice = $derived(productPriceProp || 497)
  const productRating = $derived(productRatingProp || 4.2)
  const productReviewCount = $derived(productReviewCountProp || 132)
  const forSimilarProducts = $derived(forSimilarProductsProp || false)

  // name default + the >50-char truncation quirk (ProductCard.jsx:8,16-18).
  const productName = $derived.by(() => {
    let name = productNameProp || 'LG UHD UQ75 Series 70” (70UQ7590PUB, 2022)'
    if (name.length > 50) {
      name = name.slice(0, 50) + '...'
    }
    return name
  })

  // dynamic bottom margin: 20 normally, 0 for similar-products (ProductCard.jsx:14,20-22).
  // faithful port: pre-existing quirk — `mb-${bottomMargin}` is a dynamic Tailwind
  // class (mb-20 / mb-0). It must be safelisted in tailwind.config.js (R8 / L6.2)
  // or the compiler won't emit it.
  const bottomMargin = $derived(forSimilarProducts ? 0 : 20)

  const productHeroImage = $derived(
    productImageList[0] || 'https://m.media-amazon.com/images/I/71bdeNqyARL._AC_UY436_QL65_.jpg'
  )
</script>

<div
  class={`me-9 mb-${bottomMargin} min-w-64 min-h-60 flex flex-col items-start justify-center overflow-hidden`}
>
  <Link to={`/gui/products/${productId}`}>
    <img
      src={productHeroImage}
      alt={productName}
      class="w-full rounded-xl px-4 object-contain md:h-48 2xl:h-72 py-4 bg-[#ffffff]"
    />
    <div class="mt-3 font-nunito">
      <div class="flex flex-row items-center text-xl font-bold mb-1">
        <p class="text-base me-1">$</p>
        <p class="">{productPrice}</p>
      </div>
      <p class="text-base font-semibold text-primary mb-1">
        {productName}
      </p>
    </div>
    <!-- Rating (ProductCard.jsx:53-64) inlined -->
    <div class="flex flex-row items-center">
      <span class="mr-2 text-gray-600">{productRating}</span>
      <StarRow rating={productRating} />
      <span class="ml-2 text-gray-600">{productReviewCount}</span>
    </div>
  </Link>
</div>
