<script>
  // page/gui-detail/Gallery.svelte — L6.2. Faithful port of GuiProductDetail.jsx
  // Gallery (124-142). The thumbnail strip; clicking a thumb calls onImageClick.
  let { productImageList, onImageClick } = $props()
</script>

<div class="flex flex-col max-h-[450px] w-1/12 min-w-24 overflow-scroll space-y-2">
  {#each productImageList as image, index (index)}
    <img
      src={image}
      alt={`Product Image ${index}`}
      class="w-24 min-h-24 object-contain p-1 border-[1px] border-primary rounded-md cursor-pointer"
      onclick={() => onImageClick(image)}
    />
  {/each}
</div>
