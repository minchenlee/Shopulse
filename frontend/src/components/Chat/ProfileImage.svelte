<script>
  // L2.1 — port of Chat/ProfileImage.jsx. A coloured circle keyed on role.
  let { role } = $props()
</script>

{#if role === 'assistant'}
  <span class="bg-turkey-blue  h-[28px] w-[28px] rounded-full"></span>
{:else}
  <span class="bg-secondary h-[28px] w-[28px] rounded-full"></span>
{/if}
