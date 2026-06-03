<script>
  // page/gui-detail/Spec.svelte — L6.2. Faithful port of GuiProductDetail.jsx Spec
  // (352-413). Same shape as Details: collapsible spec list, first-render-guarded
  // smooth scroll back to #productSpec on collapse, displayedSpecs = first 6 until
  // expanded. The isFirstRender ref → an $state flag (skip the first $effect run).
  let { productSpec } = $props()

  let showAllSpecs = $state(false)

  // React isFirstRender = useRef(true) → flag; skip the first $effect run.
  let isFirstRender = true

  // Spec:361-379 — scroll effect keyed on showAllSpecs.
  $effect(() => {
    showAllSpecs // track

    if (isFirstRender) {
      isFirstRender = false
      return
    }

    if (!showAllSpecs) {
      const specElement = document.getElementById('productSpec')
      if (specElement) {
        const elementPosition = specElement.offsetTop
        window.scrollTo({
          top: elementPosition - 100,
          behavior: 'smooth',
        })
      }
    }
  })

  // Spec:381-382 — title list + first-6 slice.
  const specTitleList = $derived(productSpec ? Object.keys(productSpec) : [])
  const displayedSpecs = $derived(showAllSpecs ? specTitleList : specTitleList.slice(0, 6))
</script>

{#if productSpec}
  <div class="flex flex-col font-nunito">
    <h3 id="productSpec" class="text-xl font-extrabold mb-6">Product specifications</h3>
    <ul class="w-2/3">
      {#each displayedSpecs as specTitle, index (index)}
        <li class="text-md mb-4 flex flex-row">
          <span class="w-1/4 font-bold">
            {specTitle}
          </span>
          <span class="w-3/4 ps-10">
            {productSpec[specTitle]}
          </span>
        </li>
      {/each}
    </ul>
    {#if specTitleList.length > 6}
      <div class="flex flex-row items-center w-2/3">
        <span class="w-2/5 border-b-[1px] border-primary"></span>
        <button
          onclick={() => (showAllSpecs = !showAllSpecs)}
          class="w-1/5 mx-2 text-lg text-primary font-nunito font-bold py-2"
        >
          {showAllSpecs ? 'Hide Specs' : 'See All Specs'}
        </button>
        <span class="w-2/5 border-b-[1px] border-primary"></span>
      </div>
    {/if}
  </div>
{/if}
