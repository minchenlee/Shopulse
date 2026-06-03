<script module>
  // page/gui/DotPulseLoader.svelte — L6.1/L6.2. Faithful port of the page-local
  // LoadingIndicator defined identically in BOTH Gui.jsx (420-429) and
  // GuiProductDetail.jsx (83-92). One shared component (the two React copies were
  // byte-identical). `ldrs` dotPulse.register() runs once at module load — mirrors
  // the top-of-file `import {dotPulse} from 'ldrs'; dotPulse.register()` in both pages.
  import { dotPulse } from 'ldrs'
  dotPulse.register()
</script>

<div class="z-20 w-full min-h-[calc(100vh-78px)] flex items-center justify-center bg-white text-primary">
  <l-dot-pulse size="54" speed="1.3"></l-dot-pulse>
</div>
