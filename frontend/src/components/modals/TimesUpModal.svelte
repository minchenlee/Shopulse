<script>
  // L4.1 — port of components/modals/TimesUpModal.jsx.
  // Store-driven (isTimesUp). useEffect([isTimesUp])→$effect with scroll-lock +
  // cleanup; clipboard copy + toast; hardcoded completionCode. feather-icons→
  // svelte-feather-icons (D10); react-toastify→svelte-sonner (D2).
  import { session } from '../../lib/session.svelte.js';
  // faithful port: pre-existing quirk — useClickOutside imported but never wired
  // in TimesUpModal.jsx:3 (dead import). Carried verbatim.
  import { clickOutside } from '../../lib/clickOutside.js';
  import { toast } from 'svelte-sonner';
  import { CopyIcon } from 'svelte-feather-icons';

  // useEffect([isTimesUp]) (TimesUpModal.jsx:12-26): bootstrap from localStorage,
  // lock body scroll while open, restore on cleanup.
  $effect(() => {
    const localIsTimesUp = localStorage.getItem('SHOPULSE_IS_TIMES_UP');
    if (localIsTimesUp) {
      session.isTimesUp = true;
    }

    // Disable scroll when the component mounts
    const body = document.body;
    body.style.overflow = session.isTimesUp ? 'hidden' : 'auto';

    // Re-enable scroll when the component unmounts
    return () => {
      body.style.overflow = 'auto';
    };
  });

  // faithful port: pre-existing quirk — removeTimesUp is only referenced inside
  // the commented-out close button below (dead). Carried verbatim.
  function removeTimesUp() {
    session.isTimesUp = false;
    localStorage.removeItem('SHOPULSE_IS_TIMES_UP');
  }

  const completionCode = 'w96j02u4ux87';

  // react-toastify toast(msg, {className, position, autoClose, hideProgressBar,
  // closeButton}) → svelte-sonner toast() hand-mapped (D2): class via `class`,
  // duration ← autoClose; sonner has no hideProgressBar/closeButton.
  function copyCompletionCode() {
    navigator.clipboard.writeText(completionCode);
    toast('Completion code copied!', {
      class: 'bg-secondary font-russoOne text-primary rounded-xl border-grey border-[1px] z-50',
      position: 'top-center',
      duration: 1500,
    });
  }
</script>

<div
  class={`fixed z-50 inset-0 backdrop-blur-[5px] bg-primary bg-opacity-25 flex justify-center items-center transition-opacity duration-500 ${session.isTimesUp ? 'opacity-100' : 'opacity-0 invisible'}`}
>
  <div class="w-[832px] bg-white backdrop-blur-md rounded-3xl relative bg-opacity-80">
    <div class="min-h-[324px] flex flex-col items-center justify-center w-full p-8">
      <p class="text-primary text-3xl font-russoOne mb-2">Time's up!</p>
      <p class="text-primary text-xl font-russoOne mb-2">
        Please return to the Qualtrics survey.<br />
      </p>
      <div class="flex flex-row items-center space-x-2">
        <p class="text-primary text-xl font-russoOne">
          Completion code: <span class="text-turkey-blue underline">{completionCode}</span>
        </p>
        <button
          onclick={copyCompletionCode}
          class="bg-secondary text-primary border-primary border-[1px] w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors duration-500
          active:bg-primary active:text-white active:scale-95"
        >
          <CopyIcon size="16" strokeWidth={3} />
        </button>
      </div>
      <!-- faithful port: pre-existing quirk — close button commented out in
           TimesUpModal.jsx:67-71. Carried as a comment (removeTimesUp stays dead).
      <button
        onclick={removeTimesUp}
        class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center absolute top-4 right-4">
        <XIcon size="24" strokeWidth={4} />
      </button>
      -->
    </div>
  </div>
</div>
