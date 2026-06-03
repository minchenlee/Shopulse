<script>
  // page/GuiProductDetail.svelte — L6.2. Faithful port of page/GuiProductDetail.jsx
  // (541 LOC, 14 subcomponents). The product-detail page: image + summary, then a
  // stack of SimilarProducts / Details / Spec / CustomerReview. The 13 in-file React
  // subcomponents are split into page/gui-detail/*.svelte; getSimilarProducts is a
  // shared helper module. The Details/Spec first-render scroll guards and the <Zoom>
  // swap live in those children.
  //
  // productId comes from the route param (App.svelte passes productId={params.productId})
  // instead of React's useParams(); userID comes off the session store (React
  // useUserSession). The retrieveProductData + window.scrollTo(0,0) on productId change
  // reproduces GuiProductDetail.jsx's useEffect([productId]).
  import TimesUpModal from '../components/modals/TimesUpModal.svelte'
  import InstructionModal from '../components/modals/InstructionModal.svelte'

  import DotPulseLoader from './gui/DotPulseLoader.svelte'
  import ImageBlock from './gui-detail/ImageBlock.svelte'
  import Summary from './gui-detail/Summary.svelte'
  import SimilarProducts from './gui-detail/SimilarProducts.svelte'
  import Details from './gui-detail/Details.svelte'
  import Spec from './gui-detail/Spec.svelte'
  import CustomerReview from './gui-detail/CustomerReview.svelte'
  import { getSimilarProducts } from './gui-detail/getSimilarProducts.js'

  import { session } from '../lib/session.svelte.js'
  import { fetchData } from '../lib/api.js'

  let { productId } = $props()

  // GuiProductDetail.jsx:22-24 — state. productData starts false (React `useState(false)`).
  let productData = $state(false)
  let similarProducts = $state([])
  let isLoading = $state(true)

  // retrieveProductData (26-39) — fetch product + similar, with the try/catch carried.
  async function retrieveProductData() {
    try {
      isLoading = true
      const data = await fetchData(`/products/${productId}?userId=${session.userID}`)
      const similar = await getSimilarProducts(data, productId)
      productData = data
      similarProducts = similar
      isLoading = false
    } catch (error) {
      console.error('Failed to retrieve product data:', error)
    }
  }

  // React useEffect([productId]) (41-44): refetch + scroll to top whenever productId
  // changes (the nested route param).
  $effect(() => {
    productId // track
    retrieveProductData()
    window.scrollTo(0, 0)
  })
</script>

{#if isLoading}
  <DotPulseLoader />
{:else}
  <div class="min-h-[calc(100vh-78px)] min-w-screen flex flex-col pt-10 pb-20 items-center">
    <div class="max-w-[1400px] flex flex-row mb-12">
      <div class="w-1/2">
        <ImageBlock {productData} />
      </div>
      <div class="w-1/2">
        <Summary {productData} />
      </div>
    </div>
    <div class="w-full flex flex-col items-center">
      <div class="max-w-[1216px] xl:w-[1216px] flex flex-col space-y-16 px-4">
        <SimilarProducts {similarProducts} />
        <Details productDetail={productData?.productDetail} />
        <Spec productSpec={productData?.productSpec} />
        <CustomerReview
          rating={productData?.productReview.rating}
          reviewCount={productData?.productReview.reviewCount}
          ratingDistributionList={productData?.productReview.ratingDistributionList}
          reviewList={productData?.productReview.reviewList}
        />
      </div>
    </div>
    <TimesUpModal />
    <InstructionModal />
    <!-- <ToastContainer/> dropped — single app-root <Toaster/> in App.svelte (L7.2). -->
  </div>
{/if}
