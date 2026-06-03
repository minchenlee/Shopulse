<script>
  // L5.4 — the buffer card's delete-confirm tooltip (Buffer.jsx:232-257 `ConfirmToolTip`).
  //
  // L3.2: useCursorInside → inlined `$state(false)` + onmouseenter/onmouseleave, with an
  // $effect syncing it into the parent's isConfirmOpen (React useEffect([isCursorInside])).
  // Distinct from the HistoryButton ConfirmToolTip (different styling + handleDelete shape).
  let { isConfirmOpen = false, setIsConfirmOpen, handleDelete } = $props();

  // useCursorInside, inlined.
  let isCursorInside = $state(false);
  function handleMouseEnter() {
    isCursorInside = true;
  }
  function handleMouseLeave() {
    isCursorInside = false;
  }

  // Buffer.jsx:238-244 — open/close as the cursor enters/leaves.
  $effect(() => {
    if (isCursorInside) {
      setIsConfirmOpen(true);
    } else {
      setIsConfirmOpen(false);
    }
  });
</script>

<div
  class="text-sm font-russoOne px-1 py-2 break-keep top-1/2 -right-1 -translate-y-1/2 absolute bg-secondary border-primary border-[1px] rounded-full transition-opacity duration-500 {isConfirmOpen
    ? 'opacity-100 w-40'
    : 'invisible opacity-0 w-0'}"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onclick={() => handleDelete()}
>
  Click again to delete
</div>
