<script>
  // L5.2 — the chat composer (UserInput.jsx).
  //
  // Two reconciliations vs React (R2 / D6):
  //   1. The optimistic-insert + POST that React did inline in `handleSubmit`
  //      (UserInput.jsx:50-95) now lives in the store's `sendMessage()` action — it
  //      owns the optimistic insert against the ONE canonical shape
  //      (currentMessages.data.data) and drives the streamChat transport. React's
  //      phantom second insert into `.data.body.data` (UserInput.jsx:72, a stale
  //      EventSource-era shape) is DROPPED in the store (R2). So here handleSubmit
  //      is just `session.sendMessage()`.
  //   2. The send button is still bound to the store's `sendMessageButtonRef`
  //      holder (bind:this) so the literal anchor survives, even though Buffer now
  //      calls `sendMessage()` directly (D6) instead of clicking it.
  //
  // D10: FeatherIcon → svelte-feather-icons. The non-error "Shift+Enter" toast uses
  // svelte-sonner's `toast` directly (the store only wires toast.error).
  import { SendIcon, ChevronDownIcon } from 'svelte-feather-icons';
  import { toast } from 'svelte-sonner';
  import { session } from '../../lib/session.svelte.js';

  let { className = '' } = $props();

  // UserInput.jsx:9 — tracks whether the last message is on-screen (controls the FAB).
  let isLastMessageVisible = $state(false);

  // UserInput.jsx:13-20 — auto-resize the textarea. React keyed [userInput]; here the
  // $effect re-runs when session.userInput changes (and when the textarea binds).
  $effect(() => {
    // read userInput so the effect tracks it (the resize depends on content length)
    const _ = session.userInput;
    const ta = session.textAreaRef;
    if (ta) {
      // reset to 'auto' to shrink when text is deleted, then grow to scrollHeight (min 48)
      ta.style.height = 'auto';
      ta.style.height = `${Math.max(ta.scrollHeight, 48)}px`;
    }
  });

  // UserInput.jsx:24-41 — observe the last message's visibility for the scroll FAB.
  // React keyed [currentMessages] (re-observe when the message list changes); here the
  // $effect reads session.currentMessages + session.lastMessageRef and re-wires the
  // observer, returning its teardown (mirrors the React cleanup unobserve).
  $effect(() => {
    const _ = session.currentMessages; // re-run when messages change (React dep)
    const target = session.lastMessageRef;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isLastMessageVisible = entry.isIntersecting;
      },
      { root: null, threshold: 0.1 }
    );

    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  });

  // UserInput.jsx:45-47 — update the input state as the user types.
  function handleChange(event) {
    session.userInput = event.target.value;
  }

  // UserInput.jsx:50-95 — submit. The optimistic insert + POST + error toast all live
  // in the store action now (D6); the per-send error toast is handled there too.
  function handleSubmit() {
    session.sendMessage();
  }

  // UserInput.jsx:98-115 — Enter submits, Shift+Enter is a newline. The empty-input
  // "Use Shift + Enter" hint is shown when Enter is pressed on an EMPTY input. React
  // called handleSubmit() then checked `userInput === ''` synchronously (state hadn't
  // flushed) — so the check read the PRE-submit value. We capture `wasEmpty` BEFORE
  // calling sendMessage (which clears the input) to reproduce that exactly.
  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      // prevent the default newline insertion
      event.preventDefault();
      const wasEmpty = session.userInput === '';
      handleSubmit();

      if (wasEmpty) {
        toast('Use Shift + Enter for a line break.', {
          className:
            'bg-secondary font-russoOne text-primary rounded-xl border-grey border-[1px]',
          position: 'top-center',
          autoClose: 2500,
          hideProgressBar: true,
          closeButton: false,
        });
      }
    }
  }

  // UserInput.jsx:136 — scroll the last message into view (the FAB).
  function scrollToLast() {
    session.lastMessageRef?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<div
  class="mx-auto md:max-w-3xl min-w-[768px] flex items-center border-primary relative {className}"
>
  <textarea
    bind:this={session.textAreaRef}
    rows="1"
    class="font-nunito bg-white peer no-scrollbar m-0 w-full border-primary border-[1px] max-h-96 placeholder-primary rounded-2xl ps-4 pe-16 resize-none max-h-25 py-[10px] focus:outline-none focus:ring-4 focus:ring-silver transition-all duration-300 placeholder:font-nunito placeholder:text-grey placeholder:font-bold"
    value={session.userInput}
    oninput={handleChange}
    onkeydown={handleKeyDown}
    placeholder="Message Max"
  ></textarea>
  <button
    bind:this={session.sendMessageButtonRef}
    onclick={handleSubmit}
    class="absolute bottom-1 right-2 bg-secondary h-[40px] w-[40px] rounded-full flex justify-center items-center opacity-75 duration-150 peer-focus:opacity-100 peer-focus:border-[1px] border-dark-grey hover:opacity-100 hover:scale-105 hover:shadow-md"
  >
    <SendIcon class="text-primary px-[1px]" size="28" strokeWidth="0.15rem" />
  </button>
  {#if !isLastMessageVisible}
    <button
      onclick={scrollToLast}
      class="absolute bottom-[60px] right-1/2 translate-x-1/2 w-8 h-8 bg-secondary text-primary border-[1px] border-primary font-nunito font-bold rounded-full flex items-center justify-center shadow-md opacity-50 hover:opacity-100 hover:shadow-xl hover:scale-110 transition-all duration-300"
    >
      <ChevronDownIcon strokeWidth={4} />
    </button>
  {/if}
</div>
