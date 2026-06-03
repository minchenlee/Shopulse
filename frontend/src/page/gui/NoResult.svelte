<script>
  // page/gui/NoResult.svelte — L6.1. Faithful port of Gui.jsx NoResult (395-417).
  // The Back button calls window.history.back().
</script>

<div class="ms-[234px] flex flex-col justify-center items-center min-h-[calc(100vh-78px)]">
  <h1 class="mb-4 w-full text-center text-primary font-russoOne text-2xl">
    No Results... <br />
    Try a different filter
  </h1>
  <!-- guild user back to previous page -->
  <button
    onclick={() => window.history.back()}
    class="mb-24 bg-secondary border-primary border-[1px] rounded-full px-8 py-2 text-primary font-russoOne text-xl hover:scale-105 hover:shadow-sm duration-300"
  >
    Back
  </button>
  <div class="">
    <!-- faithful port: pre-existing quirk — this /src/... path 404s in a production
         build (the dev-server-only path). Carried verbatim; do NOT fix (plan §L6.1). -->
    <img
      src="/src/assets/undraw_taken_re_yn20.svg"
      alt="No result"
      class="object-fit max-w-[600px] max-h-[400px]"
    />
  </div>
</div>
