<script>
  // L5.3 — the collapsible thread-history list (HistoryButton.jsx:7-49 `HistoryButton`).
  //
  // Renders a toggle button + the list of past threads. React iterated the threads
  // with `Object.keys(threadsList).map(...)` (HistoryButton.jsx:43) — an object-keyed
  // map. `threadsList` is, in practice, an ARRAY after login() sorts it, so
  // Object.keys yields '0','1',… and threadsList[key] indexes the array. This
  // object-vs-array inconsistency is a pre-existing quirk (the handleDelete path
  // array-filters it) — carried verbatim (faithful port: pre-existing quirk).
  import { ChevronDownIcon } from 'svelte-feather-icons';
  import { session } from '../../lib/session.svelte.js';
  import ChatHistory from './ChatHistory.svelte';

  let { text = '', className = '' } = $props();

  // HistoryButton.jsx:18-21 — expanded state + toggle.
  let isExpanded = $state(false);
  function toggleList() {
    isExpanded = !isExpanded;
  }

  // HistoryButton.jsx:24-26 — when currentMessages changes, clear the loading flag.
  // React keyed [currentMessages] and did `isLoadingThread && setIsLoadingThread(false)`.
  $effect(() => {
    const _ = session.currentMessages;
    if (session.isLoadingThread) {
      session.isLoadingThread = false;
    }
  });
</script>

<div class="w-full  {className}">
  <button
    onclick={toggleList}
    class="w-auto flex flex-row items-center text-lg text-grey font-russoOne hover:text-primary duration-300 ease-in-out text-nowrap"
  >
    <span class="me-1">{text}</span>
    <ChevronDownIcon
      size="24"
      strokeWidth={4}
      class="transition-transform duration-300 {isExpanded ? 'rotate-180' : ''}"
    />
  </button>
  <div
    class="mt-2 flex flex-col items-start transition-all duration-300 {isExpanded
      ? 'opacity-100'
      : 'opacity-0 invisible'}"
  >
    <!-- HistoryButton.jsx:43-45 — object-keyed map carried verbatim
         (faithful port: pre-existing quirk). -->
    {#each Object.keys(session.threadsList) as key, index (index)}
      <ChatHistory
        updatedAt={session.threadsList[key].updatedAt}
        threadId={session.threadsList[key].threadId}
      />
    {/each}
  </div>
</div>
