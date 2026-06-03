<script>
  // L5.4 — the placeholder card shown before any real products (Buffer.jsx:260-292
  // `DemoProductCard`). Carries the step-ten tour anchor. Buttons are inert (no
  // handlers) exactly as in React.
  // L2's Star.svelte exposes StarRow as the DEFAULT export — import as default.
  import StarRow from '../gui/Star.svelte';
  import BufferJSON from '../../dummy_data/buffer.json';

  let { product } = $props();
</script>

<div
  class="step-ten flex flex-col rounded-xl border-[1px] border-grey w-full min-w-56 lg:min-w-[350px] mb-2 font-nunito shadow-md overflow-hidden"
>
  <div class="w-full h-[250px] bg-light-silver flex items-center justify-center px-4">
    <span class="text-lg font-russoOne text-primary">
      {BufferJSON.demoCardContent}
    </span>
  </div>
  <div class="flex flex-col px-6 pb-4">
    <span class="text-base font-semibold truncate ...">{product.name}</span>
    <div class="flex flex-row items-center justify-between mb-2">
      <span class="text-lg font-extrabold text-primary">${product.price}</span>
      <div class="flex flex-row items-center text-base space-x-2">
        <span class="font-semibold text-primary">{product.rating}</span>
        <StarRow rating={product.rating} />
        <span class="font-semibold text-primary">{product.reviewCount}</span>
      </div>
    </div>
    <div class="flex flex-row items-center justify-evenly text-lg font-bold">
      <button
        class="w-full py-1 border-[1px] bg-white border-grey rounded-l-full hover:shadow-sm hover:bg-light-silver transition-all duration-300"
      >
        Details
      </button>
      <button
        class="w-full py-1 border-[1px] bg-white border-grey rounded-r-full hover:shadow-sm hover:bg-light-silver transition-all duration-300"
      >
        Reviews
      </button>
    </div>
  </div>
</div>
