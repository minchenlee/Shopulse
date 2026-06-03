<script>
  // L4.1 — port of components/modals/LoginModal.jsx (largest modal).
  // RegisterForm captures the Prolific/userID → session.login(). Store-driven via
  // session.login; props isOpen/onClose. react-markdown→marked+sanitize (D3) with
  // .markdown-modal class parity (D4); feather-icons→svelte-feather-icons (D10);
  // react-toastify toast.warning→svelte-sonner toast.warning (D2, hand-mapped).
  import { session } from '../../lib/session.svelte.js';
  // faithful port: pre-existing quirk — useClickOutside imported but never wired
  // in LoginModal.jsx:3 (dead import). Carried verbatim.
  import { clickOutside } from '../../lib/clickOutside.js';
  import { XIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon } from 'svelte-feather-icons';
  import textContent from '../../content_data/Welcome.json';
  import { toast } from 'svelte-sonner';
  import { renderMarkdown } from '../../lib/markdown.js';
  import firstPic from '../../assets/undraw_experience_design_re_dmqq.svg';
  import lastPic from '../../assets/undraw_secure_login_pdn4.svg';

  let { isOpen = false, onClose } = $props();

  let index = $state(0);
  let slowClose = $state(false);
  let isAgree = $state(false);

  // get the path to check is at the gui page (LoginModal.jsx:20-21)
  const path = window.location.pathname;
  const isGuiPage = path.includes('gui');

  // state for the user ID
  let userID = $state('');

  // closing the modal (LoginModal.jsx:27-32)
  function handleClosing() {
    if (isOpen) {
      onClose();
      setTimeout(() => (slowClose = false), 500);
    }
  }

  // when user submit the user ID — check if empty (LoginModal.jsx:36-50).
  // react-toastify toast.warning(msg, {className, position, autoClose,
  // hideProgressBar, closeButton}) → svelte-sonner toast.warning hand-mapped (D2):
  // sonner has no hideProgressBar/closeButton props; class carried via `class`,
  // duration ← autoClose. Minor visual drift accepted (D2).
  function handleRegister() {
    if (userID === '') {
      toast.warning('User ID cannot be empty', {
        class: 'bg-white bg-opacity-70 font-russoOne text-primary rounded-xl border-grey border-[1px]',
        position: 'top-center',
        duration: 2500,
      });
      return;
    }

    session.login(userID);
    handleClosing();
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      handleRegister();
    }
  }

  // useEffect([isOpen]) (LoginModal.jsx:58-66)
  $effect(() => {
    if (isOpen) {
      slowClose = true;
    }
    if (!isOpen) {
      setTimeout(() => (slowClose = false), 500);
    }
  });

  const WelcomeList = isGuiPage ? textContent.GuiWelcome : textContent.ChatWelcome;

  function updateIndex(num) {
    if (index + num < 0) {
      index = WelcomeList.length - 1;
      return;
    }
    if (index + num >= WelcomeList.length) {
      handleRegister();
      return;
    }
    index = (index + num) % WelcomeList.length;
  }

  // image selection (LoginModal.jsx:85-90): firstPic on index 0, lastPic on last,
  // undefined otherwise. $derived so it tracks index.
  let image = $derived(
    index === 0 ? firstPic : index === WelcomeList.length - 1 ? lastPic : undefined
  );

  // agree checkbox ref (React agreeRef + agreeRef.current.click()).
  let agreeEl = $state(null);
  function handleAgree() {
    isAgree = true;
  }
</script>

<div
  class={`fixed z-50 inset-0 backdrop-blur-[5px] bg-primary bg-opacity-25 flex justify-center items-center transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'} ${!slowClose ? 'invisible' : ''}`}
>
  <div class="w-[832px] bg-white backdrop-blur-md rounded-3xl relative bg-opacity-80 px-10 pt-8 pb-2">
    <!-- TitleBar (no close button in LoginModal) -->
    <div class="flex flex-row items-center justify-between mb-6">
      <h2 class="text-2xl font-russoOne">{WelcomeList[index].title}</h2>
    </div>

    {#if index === WelcomeList.length - 1}
      <!-- RegisterForm -->
      <div class="min-h-[244px] flex flex-row  justify-between text-xl font-russoOne">
        <img src={image} alt="image" class="w-[20rem] h-60" />
        <div class="h-auto me-10 flex flex-col space-y-4">
          <p class="text-primary px-4">Please enter your Prolific ID</p>
          <input
            type="text"
            oninput={(e) => (userID = e.target.value)}
            onkeydown={handleKeyDown}
            value={userID}
            placeholder="Prolific ID"
            class="w-auto h-12 bg-transparent focus:outline-none focus:ring-2 focus:ring-grey transition-all duration-300 focus:rounded-2xl border-b-2 border-grey px-4 text-lg"
          />
        </div>
      </div>
    {:else}
      <!-- Direction -->
      <div class="min-h-[244px] flex flex-row justify-between w-full h-full items-start select-none">
        {#if image}
          <img src={image} alt="image" class="w-[22rem] h-60" />
        {/if}
        <div class="font-nunito font-semibold text-primary mb-3">
          <div class="markdown-modal">
            {@html renderMarkdown(WelcomeList[index].content)}
          </div>
          {#if WelcomeList[index].content.includes('5.')}
            <div class="flex flex-row items-center justify-end space-x-2 mt-16">
              <div class="flex items-center justify-center relative">
                <input
                  type="checkbox"
                  class="cursor-pointer z-20 w-6 h-6 appearance-none rounded-lg border-primary border-[1px] peer"
                  bind:this={agreeEl}
                  onchange={handleAgree}
                  checked={isAgree}
                />
                <CheckIcon
                  class="z-10 text-primary hidden peer-checked:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  size="20"
                  strokeWidth={6}
                />
              </div>
              <p class="cursor-pointer select-none" onclick={() => agreeEl.click()}>
                I agree to follow the instructions and do my best to complete the task
              </p>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="w-full flex flex-row items-center my-4">
      <!-- Button (left) -->
      <button
        onclick={() => updateIndex(-1)}
        disabled={index === 0}
        class={`flex flex-row items-center justify-center rounded-full w-24 h-10 py-1 mt-auto font-russoOne text-xl duration-500 ease-in-out hover:scale-105 hover:shadow-md text-primary border-dark-grey border-[1px] ${index === 0 ? 'opacity-0' : ''}`}
      >
        <ChevronLeftIcon size="30" strokeWidth={4} />
        <span class=""></span>
      </button>

      <div class="mx-auto">
        <!-- DotsIndicator -->
        <div class="h-full flex flex-row justify-center items-center space-x-2">
          {#each Array.from({ length: WelcomeList.length }, (_, idx) => idx) as idx}
            <div class={`h-2 w-2 rounded-full ${index === idx ? 'bg-primary' : 'bg-grey'}`}></div>
          {/each}
        </div>
      </div>

      <!-- Button (right) -->
      <button
        onclick={() => updateIndex(1)}
        class="flex flex-row items-center justify-center rounded-full w-24 h-10 py-1 mt-auto font-russoOne text-xl duration-500 ease-in-out hover:scale-105 hover:shadow-md text-white bg-primary border-primary border-[1px]"
      >
        <span class=""></span>
        <ChevronRightIcon size="30" strokeWidth={4} />
      </button>
    </div>
  </div>
</div>
