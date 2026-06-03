<script>
  // page/gui/FilteringSubset.svelte — L6.1. Faithful port of Gui.jsx FilteringSubset
  // (466-490). A titled group of Options. parameterKey = normalzedTitle(title) (the
  // typo'd helper from lib/filterQuery.js, L0.1). urlParams is read from the live URL
  // once, exactly as React did (new URLSearchParams(window.location.search)).
  import Option from './Option.svelte'
  import { normalzedTitle } from '../../lib/filterQuery.js'

  let { title, optionList, type } = $props()

  const parameterKey = normalzedTitle(title)
  const urlParams = new URLSearchParams(window.location.search)
</script>

<div class="flex flex-col text-base mb-4">
  <h2 class="text-primary font-russoOne mb-1">{title}</h2>
  <div class="flex flex-col font-nunito">
    {#each optionList as option, index (index)}
      <Option {option} {type} {parameterKey} {index} {urlParams} />
    {/each}
  </div>
</div>
