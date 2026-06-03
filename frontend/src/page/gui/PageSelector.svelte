<script>
  // page/gui/PageSelector.svelte — L6.1. Faithful port of Gui.jsx PageSelector
  // (307-392). Prev/next pagination that mutates the ?pagination=N query param via
  // svelte-routing navigate (React useNavigate). It reads window.location.search
  // directly (as React did) rather than the router location — faithful.
  //
  // FeatherIcon chevrons → svelte-feather-icons (D10): icon='chevron-left' →
  // <ChevronLeftIcon/>, size="24px" → size="24", strokeWidth={4} kept, className → class.
  import { navigate } from 'svelte-routing'
  import { ChevronLeftIcon, ChevronRightIcon } from 'svelte-feather-icons'
  import { fetchData } from '../../lib/api.js'

  let { productDataList } = $props()

  // Read pagination off the live URL (PageSelector:310-313).
  let queryString = window.location.search
  const urlParams = new URLSearchParams(queryString)
  const pagination = parseInt(urlParams.get('pagination')) || 0
  let currentPage = $state(pagination)
  let isNextPageHasProduct = $state(false)

  // PageSelector handleNextPage (316-326)
  const handleNextPage = async () => {
    const nextPage = currentPage + 1
    currentPage = nextPage
    queryString = queryString.replace(/[?&]pagination=\d+&?/g, '')
    if (queryString === '') {
      queryString = `?pagination=${nextPage}`
    } else {
      queryString += `&pagination=${nextPage}`
    }
    navigate(queryString)
  }

  // PageSelector handlePrevPage (328-342)
  const handlePrevPage = () => {
    const prevPage = currentPage - 1
    currentPage = prevPage
    queryString = queryString.replace(/[?&]pagination=\d+&?/g, '')
    if (queryString === '') {
      queryString = `?pagination=${prevPage}`
    } else {
      queryString += `&pagination=${prevPage}`
    }

    if (prevPage === 0) {
      queryString = queryString.replace(/[?&]pagination=\d+&?/g, '')
    }
    navigate(queryString)
  }

  // Check if there is a next page (PageSelector hasNextPage, 345-364). Reads the
  // live window.location.search via the local queryString closure, as React did.
  const hasNextPage = async () => {
    let nextPageData
    const nextPage = currentPage + 1
    let nextQueryString = queryString.replace(/pagination=\d+&?/g, '')

    if (nextQueryString === '') {
      nextQueryString = `?pagination=${nextPage}`
    } else {
      nextQueryString += `&pagination=${nextPage}`
    }

    if (queryString.includes('keyword=')) {
      nextPageData = await fetchData('/products/search' + nextQueryString + '&limit=16&fullDetails=false')
    } else {
      nextPageData = await fetchData('/products/filter' + nextQueryString + '&limit=16&fullDetails=false')
    }

    return nextPageData.length > 0
  }

  // React useEffect([currentPage]) → $effect tracking currentPage.
  $effect(() => {
    currentPage // track
    hasNextPage().then((result) => {
      isNextPageHasProduct = result
    })
  })
</script>

<div class="pe-8 mt-12 flex flex-row items-center justify-center text-xl space-x-4">
  <button
    class="w-8 h-8 bg-secondary rounded-full flex items-center justify-center disabled:opacity-30"
    disabled={currentPage === 0}
    onclick={handlePrevPage}
  >
    <ChevronLeftIcon class="text-primary" size="24" strokeWidth={4} />
  </button>
  <p class="text-lg text-center w-10 leading-none text-primary font-russoOne">{currentPage + 1}</p>
  <button
    class="w-8 h-8 bg-secondary rounded-full flex items-center justify-center disabled:opacity-30"
    disabled={productDataList.length < 16 || !isNextPageHasProduct}
    onclick={handleNextPage}
  >
    <ChevronRightIcon class="text-primary" size="24" strokeWidth={4} />
  </button>
</div>
