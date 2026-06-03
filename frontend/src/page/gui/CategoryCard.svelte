<script>
  // page/gui/CategoryCard.svelte — L6.1. Faithful port of Gui.jsx CategoryCard
  // (207-237). Two layouts (screentype vs brand) selected by `type`. The brand
  // <img> uses a DYNAMIC arbitrary-value scale utility built from `scale` (Gui.jsx:234)
  // — those scale values (2, 1.7, 0.5, …) are safelisted in tailwind.config.js (R8) so
  // the compiler emits them. <Link> → svelte-routing <Link>.
  import { Link } from 'svelte-routing'

  let { name, value, img, type, scale } = $props()
  // faithful port: `parameterKey = normalzedTitle(type)` was computed in React
  // (CategoryCard:213) but never used. Dropped (dead local), not load-bearing.

  // R8 / L6.2: build the dynamic arbitrary-value scale utility in JS (mirrors React's
  // template literal at Gui.jsx:234) instead of inlining it in markup. The runtime
  // values (2 / 1.7 / 1 / 0.5) are safelisted so they are emitted; assembling the
  // bracket from pieces here keeps Tailwind's content scanner from extracting a
  // literal arbitrary-value token and emitting a broken --tw-scale-x rule into the
  // CSS. Produces the same `scale-[N]` DOM class as React, no UX change.
  const brandImgClass = `w-full h-24 object-contain scale-[` + scale + `]`
</script>

{#if type === 'screentype'}
  <Link
    to={`/gui?screenType=${value}`}
    class="min-w-[335px] min-h-48 flex items-center justify-center me-6 rounded-xl relative overflow-hidden"
  >
    <div class="z-10 w-full min-h-48 flex items-center justify-center bg-primary bg-opacity-40 backdrop-blur-[2px]">
      <p class="text-base text-white font-russoOne">{name}</p>
    </div>
    <img src={img} alt={name} class="w-full object-contain absolute z-0" />
  </Link>
{:else}
  <Link
    to={`/gui?brand=${value}`}
    class="min-w-[335px] w-[335px] min-h-24 border-2 border-grey flex items-center justify-center me-6 rounded-xl overflow-hidden"
  >
    <!-- <p className='text-2xl text-primary font-russoOne z-10'>{name}</p> -->
    <img src={img} alt={name} class={brandImgClass} />
  </Link>
{/if}
