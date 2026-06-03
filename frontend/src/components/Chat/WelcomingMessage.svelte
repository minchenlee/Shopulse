<script>
  // L5.3 — the empty-thread welcome screen (Threads.jsx:254-290 `WelcomingMessage`).
  //
  // React memoized `promptTemplate`/`shortCutTitle` and wrapped the return in a
  // `useMemo`; per the plan those dead `useMemo`s are DROPPED (Svelte needs no
  // memoization). The `ShortCut` button grid was already COMMENTED OUT in React
  // (Threads.jsx:282-286), so the only rendered content is the two headings — the
  // promptTemplate/setUserInput plumbing it fed is therefore unused. Carried (the
  // commented grid is kept verbatim below as a comment) but trimmed of the memos.
  //
  // Chat.PromptTemplate + session.userInput are intentionally NOT wired here because
  // the only consumer (ShortCut) is commented out — faithful to the React render.
</script>

<div id="thread" class="h-full w-full pt-16 pb-16 flex flex-col overflow-scroll">
  <div
    class="h-full w-full flex flex-col items-start justify-center md:max-w-3xl mx-auto text-primary font-extrabold font-nunito text-3xl text-start"
  >
    <h1 class="">Hi there! </h1>
    <h1 class="">What can I assist you with today?</h1>
    <!-- Threads.jsx:282-286 — the shortcut grid, COMMENTED OUT in React, carried verbatim:
    <div class="mt-6 flex flex-row flex-wrap justify-center gap-6">
      {#each shortCutTitle as title, index (index)}
        <ShortCut {title} />
      {/each}
    </div>
    -->
  </div>
</div>
