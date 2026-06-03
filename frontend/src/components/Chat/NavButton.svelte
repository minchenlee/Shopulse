<script>
  // L2.1 — port of Chat/NavButton.jsx. Presentational button.
  // React props { text, onclick, className } → $props(). The prop name
  // `className` is kept (not renamed to `class`) so existing call sites that
  // pass `className=` port 1:1; it's just a string concatenated into `class`.
  let { text, onclick, className = '' } = $props()
</script>

<button
  {onclick}
  class={`w-auto text-start text-lg text-grey font-russoOne hover:text-primary duration-300 ease-in-out text-nowrap ${className}`}
>
  {text}
</button>
