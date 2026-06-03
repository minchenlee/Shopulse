<script module>
  // Re-export the named `Image` so Buffer's `import { Image } from '../Chat/Carousel'`
  // (Buffer.jsx:7) resolves — React exported both from this file (`export {Carousel,
  // Image}`); Svelte splits Image into its own file and re-exports it here.
  export { default as Image } from './Image.svelte';
</script>

<script>
  // L5.1 — the product image carousel (Carousel.jsx:5-76 `Carousel` + 78-89 `ImageList`).
  //
  // The inner React `ImageList` is inlined into the scroll <div> here (it only existed
  // to hold the scrollRef; Svelte uses `bind:this`). D10: FeatherIcon chevrons →
  // svelte-feather-icons (size 'px' stripped, strokeWidth number, className→class).
  import { ChevronLeftIcon, ChevronRightIcon } from 'svelte-feather-icons';
  import Image from './Image.svelte';

  let { productList = [] } = $props();

  // Carousel.jsx:11 — defensive default (props.productList || []).
  let products = $derived(productList || []);

  // Carousel.jsx:6-9 — the four scroll-position booleans.
  let isHitStart = $state(true);
  let isHitEnd = $state(false);
  let buttonLeftSlowClose = $state(false);
  let buttonRightSlowClose = $state(false);

  // Carousel.jsx:12 — the scroll container ref (useRef → bind:this).
  let scrollRef = $state(null);

  // Carousel.jsx:13-23 — arrow buttons nudge scrollLeft by ±200.
  function scrollLeft() {
    if (scrollRef) {
      scrollRef.scrollLeft -= 200;
    }
  }
  function scrollRight() {
    if (scrollRef) {
      scrollRef.scrollLeft += 200;
    }
  }

  // Carousel.jsx:25-58 — attach a scroll listener that flips the start/end booleans;
  // React keyed the effect on [scrollRef] and cleaned up the listener. Here the
  // $effect re-runs when `scrollRef` is bound, returning the listener teardown.
  $effect(() => {
    const el = scrollRef;
    if (!el) return;

    const onScroll = () => {
      // at the end (+3 fudge, matches Carousel.jsx:29)
      if (el.scrollLeft + el.clientWidth + 3 > el.scrollWidth) {
        isHitEnd = true;
        buttonRightSlowClose = true;
      } else {
        isHitEnd = false;
        buttonRightSlowClose = false;
      }
      // at the beginning (<3, Carousel.jsx:38)
      if (el.scrollLeft < 3) {
        isHitStart = true;
        buttonLeftSlowClose = true;
      } else {
        isHitStart = false;
        buttonLeftSlowClose = false;
      }
    };

    el.addEventListener('scroll', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  });
</script>

<div class="relative mt-2">
  <button
    onclick={scrollLeft}
    class="{isHitStart ? 'opacity-0' : ''} {buttonLeftSlowClose
      ? 'invisible'
      : ''} w-[30px] h-[30px] absolute z-[15] left-2 top-1/2 -translate-y-[15px] text-primary cursor-pointer bg-secondary rounded-full border-primary border-[1px] flex items-center justify-center shadow:md hover:shadow-xl hover:scale-110 duration-300"
  >
    <ChevronLeftIcon size="24" strokeWidth={4} />
  </button>
  <button
    onclick={scrollRight}
    class="{isHitEnd ? 'opacity-0' : ''} {buttonRightSlowClose
      ? 'invisible'
      : ''} w-[30px] h-[30px] absolute z-[15] right-2 top-1/2 -translate-y-[15px] text-primary cursor-pointer bg-secondary rounded-full border-primary border-[1px] flex items-center justify-center shadow:md hover:shadow-xl hover:scale-110 duration-300 transition-all"
  >
    <ChevronRightIcon size="24" strokeWidth={4} />
  </button>

  <!-- Carousel.jsx:78-89 ImageList, inlined. bind:this is the React scrollRef. -->
  <div
    bind:this={scrollRef}
    class="snap-x snap-mandatory relative flex flex-row w-full overflow-scroll gap-5 no-scrollbar scroll-smooth"
  >
    {#each products as product, index (index)}
      <Image {product} />
    {/each}
  </div>
</div>
