<script>
  // L2.2 — port of gui/Searchbar.jsx. The GUI header search box; carries the
  // `step-one` tour anchor (L7.1 selector inventory). Reads/writes searchQuery on
  // the session store and navigates to /gui?keyword=… on submit.
  import { navigate } from 'svelte-routing'
  import { SearchIcon } from 'svelte-feather-icons' // D10: feather-icons-react → svelte-feather-icons
  import { session } from '../../lib/session.svelte.js'
  // faithful port: pre-existing quirk — React imported `fetchData` (and Link /
  // useLocation) but never used them. The dead `fetchData` import is noted, not
  // re-added (it has no effect); Link/useLocation were React-router specifics.

  // handleSearch (Searchbar.jsx:11-19): no-op on empty query, else navigate.
  function handleSearch() {
    let queryString = ''
    if (session.searchQuery !== '') {
      queryString = `?keyword=${session.searchQuery}`
    } else {
      return
    }
    navigate('/gui' + queryString)
  }

  // Enter submits (Searchbar.jsx:21-26).
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }
</script>

<div class="step-one ms-8  w-1/3 max-w-[480px] font-nunito font-semibold relative">
  <input
    type="text"
    placeholder="Search"
    value={session.searchQuery}
    oninput={(e) => (session.searchQuery = e.target.value)}
    onkeydown={handleKeyDown}
    class="w-full peer bg-white border-[1px] border-primary rounded-2xl p-2 focus:outline-none focus:ring-2 focus:ring-silver transition-all duration-300 placeholder-primary placeholder:font-nunito placeholder:text-grey placeholder:font-bold"
  />
  <button
    onclick={handleSearch}
    class="absolute bottom-1 right-1 bg-secondary h-[34px] w-[34px] rounded-full flex justify-center items-center shadow-sm "
  >
    <SearchIcon class="text-primary px-[1px]" size="24" strokeWidth={4} />
  </button>
</div>
