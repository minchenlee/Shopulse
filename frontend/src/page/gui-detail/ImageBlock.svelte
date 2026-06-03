<script>
  // page/gui-detail/ImageBlock.svelte — L6.2. Faithful port of GuiProductDetail.jsx
  // ImageBlock (95-121). A sticky gallery + the zoomable main image. selectedImage
  // starts at productImageList[0] and Gallery thumbnails swap it.
  //
  // D5: react-medium-image-zoom <Zoom> → svelte-medium-image-zoom <Zoom> (the same
  // default-export wrapper Carousel/Image uses). The 97-line override CSS is re-pointed
  // to the [data-smiz-*] selectors and side-imported once at the app root.
  import Zoom from 'svelte-medium-image-zoom'
  import Gallery from './Gallery.svelte'

  let { productData } = $props()

  // ImageBlock:97 — selectedImage initialized to the first image.
  let selectedImage = $state(productData?.productImageList[0])

  const handleImageClick = (imageSrc) => {
    selectedImage = imageSrc
  }
</script>

{#if productData}
  <div class="w-full h-full relative">
    <div class="px-16 sticky top-[78px] pt-24 pb-6 flex flex-row items-center">
      <Gallery productImageList={productData.productImageList} onImageClick={handleImageClick} />
      <Zoom>
        <img
          src={selectedImage}
          alt={productData.productName}
          class="max-h-[450px] w-11/12 object-contain ms-4"
        />
      </Zoom>
    </div>
  </div>
{/if}
