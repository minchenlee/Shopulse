<script>
  // page/gui/FilteringSidebar.svelte — L6.1. Faithful port of Gui.jsx FilteriingSidebar
  // (note the typo'd React name; component renamed here, behavior identical) at 432-463
  // (memo dropped). The fixed filter rail: a Reset button + one FilteringSubset per
  // FilteringOptionList entry. Carries the `step-two` tour anchor via `class`.
  //
  // faithful port: React passed setProductDataList/setIsLoadingData props that
  // FilteriingSidebar never used (dead props). Dropped — they changed nothing.
  import { navigate } from 'svelte-routing'
  import FilteringSubset from './FilteringSubset.svelte'
  import GuiContent from '../../content_data/GUI.json'

  // className (not `class`) to match the codebase's prop convention (NavButton/
  // UserInput/etc. all take `className`). Carries the `step-two` tour anchor.
  let { className = '' } = $props()

  const FilteringOptionList = GuiContent.mainPage.FilteringOptionList

  // resetFilter (FilteringSidebar:436-439): navigate to the bare pathname (drops the
  // whole query string), replace:true.
  function resetFilter() {
    const newUrl = window.location.pathname
    navigate(newUrl, { replace: true })
  }
</script>

<div class="{className} pt-4 ps-8 fixed h-screen w-[234px] border-e-[1px] border-primary overflow-scroll no-scrollbar pb-24">
  <div class="flex flex-row items-center mb-4">
    <h1 class="text-primary font-russoOne text-xl">Filter</h1>
    <button
      onclick={resetFilter}
      class="bg-secondary border-primary border-[1px] rounded-full px-4 text-primary font-russoOne text-base ms-auto me-4 hover:scale-105 hover:shadow-sm duration-300"
    >
      Reset
    </button>
  </div>
  {#each FilteringOptionList as optionObject, index (index)}
    <FilteringSubset
      title={optionObject.title}
      optionList={optionObject.options}
      type={optionObject.type}
    />
  {/each}
</div>
