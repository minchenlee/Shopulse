<script>
  // page/gui/CategoryList.svelte — L6.1. Faithful port of Gui.jsx CategoryList
  // (179-204, was memo()'d — memo dropped). Renders a titled, horizontally-scrolling
  // row of CategoryCards. The `imageDict[category.img]` lookup (Gui.jsx:193) is done
  // here against the shared imageDict module, exactly as the React closure did.
  import CategoryCard from './CategoryCard.svelte'
  import { imageDict } from './imageDict.js'

  let { title, categoryList, type } = $props()
</script>

<div class="flex flex-col">
  <h2 class="text-primary font-russoOne text-xl mb-4">{title}</h2>
  <div class="flex flex-row items-center pe-40 overflow-scroll no-scrollbar">
    {#each categoryList as category (category.value)}
      <CategoryCard
        name={category.name}
        value={category.value}
        {type}
        img={imageDict[category.img]}
        scale={category.scale}
      />
    {/each}
  </div>
  <!-- faithful port: pre-existing quirk — three invisible scale divs (Gui.jsx:199-201)
       that leaked scale-[2]/scale-[1.7]/scale-[0.5] into the React build's class glob.
       Carried verbatim; the values are also in the tailwind.config.js safelist (R8). -->
  <div class="invisible scale-[2]"></div>
  <div class="invisible scale-[1.7]"></div>
  <div class="invisible scale-[0.5]"></div>
</div>
