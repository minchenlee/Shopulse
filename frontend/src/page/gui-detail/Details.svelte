<script>
  // page/gui-detail/Details.svelte — L6.2. Faithful port of GuiProductDetail.jsx
  // Details (288-349). A collapsible product-details list with a first-render-guarded
  // smooth scroll: when the user COLLAPSES (showAllDetails → false), scroll back to the
  // #productDetail heading; but skip the very first effect run (React's
  // isFirstRender useRef → an $state flag here). displayedDetails shows the first 50%
  // of keys until expanded.
  let { productDetail } = $props()

  let showAllDetails = $state(false)

  // React isFirstRender = useRef(true). The $effect below would otherwise fire once on
  // mount (when showAllDetails is first read) and scroll unexpectedly; this flag skips
  // that first run, exactly as the React ref did.
  let isFirstRender = true

  // Details:296-312 — scroll effect keyed on showAllDetails.
  $effect(() => {
    showAllDetails // track

    if (isFirstRender) {
      isFirstRender = false
      return
    }

    if (!showAllDetails) {
      const detailElement = document.getElementById('productDetail')
      if (detailElement) {
        const elementPosition = detailElement.offsetTop
        window.scrollTo({
          top: elementPosition - 100,
          behavior: 'smooth',
        })
      }
    }
  })

  // Details:314-316 — title list + the first-50% slice.
  const detailTitleList = $derived(productDetail ? Object.keys(productDetail) : [])
  const detailTitleListLength = $derived(detailTitleList.length)
  const displayedDetails = $derived(
    showAllDetails ? detailTitleList : detailTitleList.slice(0, parseInt(detailTitleListLength * 0.5))
  )
</script>

{#if productDetail}
  <div class="flex flex-col font-nunito">
    <h3 id="productDetail" class="text-xl font-extrabold mb-6">Product details</h3>
    <ul class="w-2/3">
      {#each displayedDetails as detail, index (index)}
        <li class="flex flex-col text-base mb-4">
          <span class="font-bold">
            {detail}
          </span>
          <span class="">
            {productDetail[detail]}
          </span>
        </li>
      {/each}
    </ul>
    {#if detailTitleList.length > parseInt(detailTitleListLength * 0.5)}
      <div class="flex flex-row items-center w-2/3">
        <span class="w-2/5 border-b-[1px] border-primary"></span>
        <button
          onclick={() => (showAllDetails = !showAllDetails)}
          class="w-1/5 mx-2 text-lg text-primary font-nunito font-bold py-2"
        >
          {showAllDetails ? 'Hide Details' : 'See All Details'}
        </button>
        <span class="w-2/5 border-b-[1px] border-primary"></span>
      </div>
    {/if}
  </div>
{/if}
