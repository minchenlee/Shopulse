<script>
  // L2.1 — port of gui/Star.jsx. The React file exported THREE symbols:
  // StarRow (the public one, used by StatisticBlock/ProductCard/Buffer) plus the
  // internal Star / HollowStar SVGs. A Svelte file has a single default component,
  // so this file IS StarRow; the filled/hollow SVGs are inlined below via {#if}.
  //
  // STRUCTURAL DEVIATION (not a logic fix): ProductCard/GuiProductDetail wrote
  // `import { StarRow, Star, HollowStar }` but only ever rendered <StarRow/> —
  // the Star/HollowStar named imports were dead (D11 quirk). Svelte cannot expose
  // those as named exports of a component, so consumers import StarRow as the
  // default and the dead named imports are necessarily dropped.
  let { rating } = $props()
</script>

<!-- StarRow: 5 stars, filled while i <= rating else hollow (Star.jsx:1-11). -->
<div class="flex items-center space-x-[1px]">
  {#each [1, 2, 3, 4, 5] as i}
    {#if i <= rating}
      <!-- Star() — filled (Star.jsx:14-26) -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-primary"
        viewBox="0 0 20 20"
        fill="currentColor"
        stroke="currentColor"
      >
        <path
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
        />
      </svg>
    {:else}
      <!-- HollowStar() — outline (Star.jsx:28-40) -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-primary"
        fill="none"
        viewBox="0 0 20 20"
        stroke="currentColor"
      >
        <path
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
        />
      </svg>
    {/if}
  {/each}
</div>
