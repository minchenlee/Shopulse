<script>
  // page/gui/Option.svelte — L6.1. Faithful port of Gui.jsx Option (493-555). A single
  // filter checkbox/radio. The React `handleOptionChange(parameterKey, value, navigate)`
  // is now buildFilterUrl (lib/filterQuery.js, L0.1) + a navigate({replace:true}) — the
  // ONLY structural change vs React (the filter engine moved to lib; the comma-operator
  // quirks live there, carried). onChange → onchange.
  import { navigate } from 'svelte-routing'
  import { buildFilterUrl } from '../../lib/filterQuery.js'

  let { option, type, parameterKey, index, urlParams } = $props()

  // value derivation (Option:502-508). For 'single' (range) options the value is the
  // first two object values joined with '-'.
  let value
  if (type === 'single') {
    const optionKeys = Object.keys(option.value)
    value = `${option.value[optionKeys[0]]}-${option.value[optionKeys[1]]}`
  } else {
    value = option.value
  }

  // isChecked derivation (Option:500, 510-526). Plain `let`, computed ONCE at mount —
  // NOT $derived. This is faithful: React's FilteriingSidebar was memo()'d with only a
  // static `className` prop, so it never re-rendered after mount → urlParams/isChecked
  // were captured at mount and did NOT live-update on a filter toggle. Making these
  // $derived would change that behavior. (The svelte `state_referenced_locally` warning
  // is expected and benign here.)
  let isChecked = false
  if (urlParams.get(parameterKey)) {
    const queryValueList = urlParams.get(parameterKey).split(',')
    for (let queryValue of queryValueList) {
      if (queryValue === value) {
        isChecked = true
      }
    }
  }

  if (parameterKey === 'price' || parameterKey === 'screenSize') {
    const queryValue = urlParams.get('min' + parameterKey.charAt(0).toUpperCase() + parameterKey.slice(1))
    if (queryValue === value.split('-')[0]) {
      isChecked = true
    }
  }

  // React: onChange={() => handleOptionChange(parameterKey, value, navigate)}.
  // buildFilterUrl returns the URL string; navigate applies it with replace:true
  // (exactly handleOptionChange's final navigate(newUrl, {replace:true})).
  function onOptionChange() {
    const newUrl = buildFilterUrl(parameterKey, value, window.location.search)
    navigate(newUrl, { replace: true })
  }
</script>

<div class="flex items-center w-auto mb-[2px]">
  {#if type === 'single'}
    <input
      id={value}
      type="radio"
      checked={isChecked}
      name={parameterKey}
      {value}
      onchange={onOptionChange}
      class="cursor-pointer appearance-none w-[14px] h-[14px] rounded-full checked:bg-primary border-primary border-[1px] duration-150"
    />
  {:else}
    <input
      id={value}
      type="checkbox"
      checked={isChecked}
      onchange={onOptionChange}
      class="cursor-pointer appearance-none w-[14px] h-[14px] rounded-sm checked:bg-primary border-primary border-[1px] duration-150"
    />
  {/if}
  <label for={value} class="cursor-pointer ms-2 text-primary font-nunito w-auto min-w-20 hover:font-bold duration-150">
    {option.name}
  </label>
</div>
