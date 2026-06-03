<script>
  // L5.3 — one row in the thread-history list (HistoryButton.jsx:52-108 `ChatHistory`).
  //
  // Shows the thread's local date + time and a trash button that reveals the
  // ConfirmToolTip. Clicking a row switches currentThreadID (which App.svelte's
  // effect turns into a history fetch). The date/time toLocale* formatting is the
  // L0.3 inline helper, carried verbatim.
  import { TrashIcon } from 'svelte-feather-icons';
  import { session } from '../../lib/session.svelte.js';
  import ConfirmToolTip from './HistoryConfirmToolTip.svelte';

  let { updatedAt, threadId } = $props();

  // HistoryButton.jsx:60 — the delete-confirm tooltip open state.
  let isConfirmOpen = $state(false);

  // HistoryButton.jsx:66-78 — local date/time formatting (carried verbatim).
  function convertToLocalDate(date) {
    const convertedDate = new Date(date);
    return convertedDate.toLocaleDateString();
  }
  function convertToLocalTime(date) {
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const convertedDate = new Date(date);
    return convertedDate.toLocaleTimeString([], options);
  }

  let date = $derived(convertToLocalDate(updatedAt));
  let time = $derived(convertToLocalTime(updatedAt));

  // HistoryButton.jsx:86-91 — switch threads only if different (avoids reloading the
  // same thread). setIsLoadingThread(true) + setCurrentThreadID(threadId).
  function onClick() {
    if (threadId !== session.currentThreadID) {
      session.isLoadingThread = true;
      session.currentThreadID = threadId;
    }
  }
</script>

<div
  class="cursor-pointer mb-2 w-full h-full flex flex-row items-center justify-center text-grey hover:text-primary"
>
  <button
    onclick={onClick}
    class="w-full flex flex-row text-start font-russoOne duration-150"
  >
    <span class="text-base w-1/2">{date}</span>
    <span class="text-base w-1/2 font-extrabold font-nunito ms-4">{time}</span>
  </button>
  <button
    onclick={() => (isConfirmOpen = !isConfirmOpen)}
    class="w-auto relative duration-150 hover:scale-110 hover:bg-secondary rounded-full"
  >
    <TrashIcon class="ms-auto" size="18" strokeWidth={3} />
    <ConfirmToolTip {threadId} {isConfirmOpen} setIsConfirmOpen={(v) => (isConfirmOpen = v)} />
  </button>
</div>
