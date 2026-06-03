<script module>
  // L2.1 — port of Chat/LoadingIndicator.jsx. Keeps the `ldrs` custom element.
  // The React file ran `dotPulse.register()` at module top-level; `<script module>`
  // is the Svelte equivalent (runs once when the module is first evaluated), so the
  // <l-dot-pulse> custom element is defined exactly once.
  import { dotPulse } from 'ldrs'
  dotPulse.register()
</script>

<div
  class="z-20 absolute inset-0 w-full h-full flex items-center justify-center bg-white text-primary"
>
  <l-dot-pulse size="54" speed="1.3"></l-dot-pulse>
</div>
