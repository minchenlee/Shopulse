<script>
  // L5.1 — the carousel's single image card (Carousel.jsx:92-106 `Image`).
  //
  // In React this was a named component in Carousel.jsx exported alongside Carousel
  // (`export {Carousel, Image}`) and re-used by Buffer. Svelte's one-default-export
  // model means it lives in its own file; Carousel.svelte re-exports it from a
  // `<script module>` so `import { Image } from './Carousel.svelte'` (Buffer's import
  // shape) still resolves — preserving the named export contract.
  //
  // D5: react-medium-image-zoom <Zoom> → svelte-medium-image-zoom <Zoom> (default
  // export, Svelte-5 snippet `children` — the slotted <div> is the zoom target).
  import Zoom from 'svelte-medium-image-zoom';

  let { product = {} } = $props();

  // Carousel.jsx:93-94 — faithful defaulting ($derived so it tracks the product prop).
  let name = $derived(product.name || '');
</script>

<Zoom>
  <div
    class="snap-center rounded-xl border-[1px] border-primary w-72 min-w-72 h-56 mb-2 relative flex items-center justify-center bg-white"
  >
    <img src={product.image} alt={name} class="w-full max-h-[80%] px-3  object-contain" />
    <span
      class="absolute w-full bottom-0 text-sm rounded-b-[11px] text-primary font-nunito font-bold ps-2 py-[2px] mt-4 truncate"
    >
      {name}
    </span>
  </div>
</Zoom>
