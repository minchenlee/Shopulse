<script>
  // L4.1 — port of components/modals/InstructionModal.jsx.
  // Store-driven (isInstructionModalOpen). useState→$state, useEffect→$effect,
  // react-markdown→marked+{@html}+DOMPurify (D3) with scoped .markdown-modal
  // class parity (D4), feather-icons-react→svelte-feather-icons (D10).
  import { session } from '../../lib/session.svelte.js';
  // faithful port: pre-existing quirk — useClickOutside is imported but never
  // wired in InstructionModal.jsx:3 (dead import). Carried verbatim.
  import { clickOutside } from '../../lib/clickOutside.js';
  import { XIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon } from 'svelte-feather-icons';
  import textContent from '../../content_data/Welcome.json';
  import { renderMarkdown } from '../../lib/markdown.js';

  let index = $state(0);
  let slowClose = $state(false);
  let isAgree = $state(true);

  // get the path to check is at the gui page (InstructionModal.jsx:16-20)
  const path = window.location.pathname;
  let isGuiPage;
  if (path.includes('gui')) {
    isGuiPage = true;
  }

  // closing the modal (InstructionModal.jsx:23-28)
  function handleClosing() {
    if (session.isInstructionModalOpen) {
      session.isInstructionModalOpen = false;
      setTimeout(() => (slowClose = false), 500);
    }
  }

  // useEffect([isInstructionModalOpen]) (InstructionModal.jsx:30-38)
  $effect(() => {
    if (session.isInstructionModalOpen) {
      slowClose = true;
    }
    if (!session.isInstructionModalOpen) {
      // faithful port: pre-existing quirk — the React setTimeout body is
      // `() => {setSlowClose(false), setIndex(0)}` (comma operator), so BOTH run.
      setTimeout(() => {
        slowClose = false;
        index = 0;
      }, 500);
    }
  });

  const WelcomeList = isGuiPage ? textContent.GuiInstruction : textContent.ChatInstruction;

  function updateIndex(num) {
    if (index + num < 0) {
      index = WelcomeList.length - 1;
      return;
    }
    if (index + num >= WelcomeList.length) {
      handleClosing();
      return;
    }
    index = (index + num) % WelcomeList.length;
  }

  // input ref for the agree checkbox (React: agreeRef + agreeRef.current.click()).
  let agreeEl = $state(null);
  function handleAgree() {
    isAgree = true;
  }
</script>

<div
  class={`fixed z-50 inset-0 backdrop-blur-[5px] bg-primary bg-opacity-25 flex justify-center items-center transition-opacity duration-500 ${session.isInstructionModalOpen ? 'opacity-100' : 'opacity-0'} ${!slowClose ? 'invisible' : ''}`}
>
  <div class="w-[832px] bg-white backdrop-blur-md rounded-3xl relative bg-opacity-80 px-10 pt-8 pb-2">
    <!-- TitleBar -->
    <div class="flex flex-row items-center justify-between mb-6">
      <h2 class="text-2xl font-russoOne">{WelcomeList[index].title}</h2>
      <button class="" onclick={handleClosing}>
        <XIcon class="text-dark-grey px-[1px] hover:text-primary duration-300" size="32" strokeWidth={3} />
      </button>
    </div>

    <!-- Direction -->
    <div class="min-h-[244px] flex flex-row justify-between w-full h-full items-start">
      {#if WelcomeList[index].image}
        <img src={WelcomeList[index].image} alt="image" class="w-[22rem] h-60" />
      {/if}
      <div class="font-nunito font-semibold text-primary mb-3 select-none">
        <!-- react-markdown(customParagraphRenderer) → marked+sanitize+.markdown-modal -->
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
