<script module>
  // L5.3 — the module-level handleDelete (HistoryButton.jsx:137-164).
  //
  // FAITHFUL PORT: pre-existing quirk / latent crash path (verified-fact #9, D11):
  //   - `createNewThread` is referenced (HistoryButton.jsx:151) but never imported in
  //     the React file → ReferenceError if the "no threads left" branch is hit.
  //   - `toast` is referenced in the catch (HistoryButton.jsx:156) but never imported
  //     → ReferenceError if a delete fails.
  // Both are carried verbatim as bare (undeclared) references so the crash happens at
  // exactly the same place it would in React. DO NOT add the imports — that would
  // change the research UX.
  //
  // Also carried: `threadsList` is array-spread/filtered here ([...threadsList]) even
  // though HistoryButton.jsx maps it as an object — the object-vs-array inconsistency.
  import { deleteData } from '../../lib/api.js';

  export async function handleDelete(
    userID,
    threadId,
    threadsList,
    setCurrentThreadID,
    updateThreadsList,
    setIsLoadingThread
  ) {
    try {
      setIsLoadingThread(true);
      await deleteData(`/chat/threads?threadId=${threadId}&userId=${userID}`);
      await updateThreadsList();

      // find the matching thread and remove it from the list (array-filter quirk)
      let newThreadsList = [...threadsList];
      newThreadsList = newThreadsList.filter((thread) => thread.threadId !== threadId);

      // if newThreadsList is not empty, set the currentThreadID to the first thread
      if (Object.keys(newThreadsList).length !== 0) {
        setCurrentThreadID(newThreadsList[0].threadId);
      } else {
        // faithful port: pre-existing quirk — `createNewThread` is NOT imported
        // (latent ReferenceError, exactly as in HistoryButton.jsx:151).
        createNewThread(userID, threadsList, setCurrentThreadID, setIsLoadingThread); // eslint-disable-line
      }
    } catch (error) {
      console.error('Failed to delete the thread:', error);
      // faithful port: pre-existing quirk — `toast` is NOT imported in the React file
      // (latent ReferenceError, exactly as in HistoryButton.jsx:156).
      toast.error('Failed to delete the thread', { // eslint-disable-line
        className: 'bg-white font-russoOne text-primary rounded-xl border-grey border-[1px]',
        position: 'top-center',
        autoClose: false,
        hideProgressBar: true,
        closeButton: true,
      });
    }
  }
</script>

<script>
  // L5.3 — the delete-confirm tooltip (HistoryButton.jsx:110-135 `ConfirmToolTip`).
  //
  // L3.2: useCursorInside → inlined `$state(false)` + onmouseenter/onmouseleave. An
  // $effect syncs that into the parent's isConfirmOpen (mirrors the React
  // useEffect([isCursorInside])). Clicking the tooltip fires the module-level
  // handleDelete with the store accessors.
  // `handleDelete` is declared in this file's `<script module>` above and is directly
  // in scope here (no self-import needed).
  import { session } from '../../lib/session.svelte.js';

  let { threadId, isConfirmOpen = false, setIsConfirmOpen } = $props();

  // useCursorInside, inlined (HistoryButton.jsx:115 + hooks/useCursorInside.jsx).
  let isCursorInside = $state(false);
  function handleMouseEnter() {
    isCursorInside = true;
  }
  function handleMouseLeave() {
    isCursorInside = false;
  }

  // HistoryButton.jsx:117-123 — open/close the tooltip as the cursor enters/leaves.
  $effect(() => {
    if (isCursorInside) {
      setIsConfirmOpen(true);
    } else {
      setIsConfirmOpen(false);
    }
  });

  function onClick() {
    // HistoryButton.jsx:130 — call the module-level handleDelete with store accessors.
    handleDelete(
      session.userID,
      threadId,
      session.threadsList,
      (v) => (session.currentThreadID = v),
      session.updateThreadsList,
      (v) => (session.isLoadingThread = v)
    );
  }
</script>

<div
  class="text-sm font-russoOne px-1 py-1 break-keep top-0 -right-1 -translate-y-2 absolute bg-secondary border-primary border-[1px] rounded-lg transition-opacity duration-500 {isConfirmOpen
    ? 'opacity-100 w-40'
    : 'invisible opacity-0 w-0'}"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onclick={onClick}
>
  Click again to delete
</div>
