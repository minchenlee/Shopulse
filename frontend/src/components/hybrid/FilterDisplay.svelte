<script>
  // L5.4 — the filter-chip header in the buffer (Buffer.jsx:99-142 `FilterDisplay`).
  //
  // Lists `key: value` chips from the filtering condition and a "clear all" button
  // that seeds a reset prompt into the composer (session.userInput). Renders nothing
  // when there are no filters (Buffer.jsx:108-110 early return).
  import { session } from '../../lib/session.svelte.js';

  let { filteringCondition = null, isBufferShown = false } = $props();

  // Buffer.jsx:103-106 — build the `key: value` chip strings.
  let filterList = $derived.by(() => {
    const filterKeyList = filteringCondition ? Object.keys(filteringCondition) : [];
    return filterKeyList ? filterKeyList.map((key) => `${key}: ${filteringCondition[key]}`) : [];
  });

  // Buffer.jsx:112-114 — clear-all seeds a reset prompt (NOT auto-sent in React; it
  // just fills the input). Carried as-is.
  function handleClearAll() {
    session.userInput = 'Forget all previous filters, I want to start over.';
  }

  // Buffer.jsx:116 — chip-container opacity follows the buffer-shown state.
  let filterOpacity = $derived(isBufferShown ? 'opacity-100' : 'opacity-0');
</script>

{#if filterList.length >= 1}
  <div
    class="step-nine bg-white flex flex-col border-[1px] border-primary rounded-lg px-4 py-2 w-full duration-1000 {filterOpacity}"
  >
    <div class="flex flex-row items-center justify-between mb-2">
      <span class="text-xl font-extrabold text-primary">Filter</span>
      <button
        onclick={handleClearAll}
        class="text-lg text-dark-grey font-bold underline decoration-solid hover:text-primary duration-300"
      >
        clear all
      </button>
    </div>
    <div class="flex flex-row flex-wrap items-start justify-start">
      {#each filterList as filter, index (index)}
        <span
          class="px-4 py-1 bg-secondary text-primary font-extrabold text-sm rounded-full me-1 mb-2"
        >
          {filter}
        </span>
      {/each}
    </div>
  </div>
{/if}
