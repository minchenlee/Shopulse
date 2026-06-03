<script>
  // page/Gui.svelte — L6.1. Faithful port of page/Gui.jsx (797 LOC), the GUI filter
  // page. The filter-URL engine lives in lib/filterQuery.js (L0.1) and is consumed by
  // the Option/FilteringSubset/FilteringSidebar children; this file is the query-
  // string-driven shell: it watches the router location, fetches the product list,
  // and branches the layout on hasResult/hasNoFilter/isLoadingData.
  //
  // Location: svelte-routing's useLocation() store (reactive {pathname,search}). This
  // page runs inside the nested <Router> under <Layout> for /gui/*, so the context
  // resolves. The React useEffect([location]) → a $effect keyed on $location.search.
  //
  // faithful port: pre-existing quirk — Gui.jsx imported DummyData (filterProduct.json,
  // line 15) but never used it. NOT recreated as a dead import (it's a JSON asset with
  // no behavior); documented here per D11.
  import { useLocation } from 'svelte-routing'

  // (ProductCard, imported by Gui.jsx for its in-file subcomponents, is now imported
  // directly by the gui/* children — ResultList/SortProductList — not by this page.)
  import LoginModal from '../components/modals/LoginModal.svelte'
  import TimesUpModal from '../components/modals/TimesUpModal.svelte'
  import InstructionModal from '../components/modals/InstructionModal.svelte'

  import FilteringSidebar from './gui/FilteringSidebar.svelte'
  import CategoryList from './gui/CategoryList.svelte'
  import SortProductList from './gui/SortProductList.svelte'
  import ResultList from './gui/ResultList.svelte'
  import NoResult from './gui/NoResult.svelte'
  import DotPulseLoader from './gui/DotPulseLoader.svelte'

  import GuiContent from '../content_data/GUI.json'
  import { session } from '../lib/session.svelte.js'
  import { fetchData } from '../lib/api.js'
  import { startTour, guiSteps } from '../lib/tour.js'

  const location = useLocation()

  const brandList = GuiContent.mainPage.Category.Brand
  const screenTypeList = GuiContent.mainPage.Category.ScreenType

  let hasNoFilter = $state(true)

  // getProductDataList (Gui.jsx:49-66): keyword→search else filter; set the store
  // list; then scroll to top + clear loading after 300ms.
  async function getProductDataList(queryString) {
    let data
    session.isLoadingData = true

    if (queryString.includes('keyword=')) {
      data = await fetchData('/products/search' + queryString)
    } else {
      data = await fetchData('/products/filter' + queryString)
    }

    session.productDataList = data
    // back to the top of the page
    setTimeout(() => {
      window.scrollTo(0, 0)
      session.isLoadingData = false
    }, 300)
  }

  // React useEffect([location]) (Gui.jsx:68-86). Keyed on the router location's search
  // string so it re-runs on every filter change.
  $effect(() => {
    const search = $location.search // track

    const localStorage = JSON.parse(window.localStorage.getItem('SHOPULSE')) || {}
    const userID = localStorage.userID

    let queryString = search
    if (queryString !== '') {
      queryString += '&limit=16&fullDetails=false&userId=' + userID
      hasNoFilter = false
    } else {
      queryString = '?limit=16&fullDetails=false&userId=' + userID
      session.searchQuery = ''
      setTimeout(() => {
        hasNoFilter = true
      }, 300)
    }

    getProductDataList(queryString)
  })

  // Tour (Gui.jsx handleReset, 90-101): only reset + stop branches (no Buffer on /gui).
  let tourRunning = false
  $effect(() => {
    if (session.isTourStart && !tourRunning) {
      tourRunning = true
      startTour({
        steps: guiSteps,
        onReset: () => {
          session.isTourStart = false
        },
        onStop: () => {
          if (!session.timerActive) {
            session.setTimerActive(true)
          }
          tourRunning = false
        },
      })
    }
  })
</script>

<div class="min-h-[calc(100vh-78px)] min-w-screen relative">
  <FilteringSidebar className="step-two" />
  {#if session.hasResult}
    <div class="ms-[234px] ps-8 pt-4 space-y-16 pb-12">
      {#if hasNoFilter}
        <CategoryList title="By brand" type="brand" categoryList={brandList} />
        <CategoryList title="By screen type" type="screentype" categoryList={screenTypeList} />
        <SortProductList query="&minPrice=600" title="Popular" />
        <SortProductList query="&sortBy=rating&maxPrice=650" title="On Budget" />
      {:else if session.isLoadingData}
        <DotPulseLoader />
      {:else}
        <ResultList />
      {/if}
    </div>
  {:else}
    <NoResult />
  {/if}
  <LoginModal isOpen={session.isLoginModalOpen} onClose={() => (session.isLoginModalOpen = false)} />
  <InstructionModal />
  <TimesUpModal />
  <!-- <ToastContainer/> dropped — single app-root <Toaster/> in App.svelte (L7.2). -->
</div>
