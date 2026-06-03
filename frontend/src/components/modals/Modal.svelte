<script>
  // L4.1 — port of components/modals/Modal.jsx ("How to ask?" carousel).
  // useState→$state, useEffect([isOpen])→$effect, useClickOutside→use:clickOutside
  // action (L3.1), feather-icons-react `x`→svelte-feather-icons XIcon (D10).
  //
  // The React file defined TitleBar / Direction / NextButton as local
  // components; single-use, so inlined here as markup (CLAUDE.md: no
  // single-use abstractions). Behaviour is byte-faithful.
  import { clickOutside } from '../../lib/clickOutside.js';
  import { XIcon } from 'svelte-feather-icons';
  import textContent from '../../content_data/Chat.json';

  let { isOpen = false, onClose } = $props();

  let index = $state(0);
  let slowClose = $state(false);

  // useClickOutside(() => { if (isOpen) { onClose(); setTimeout(...,500) } })
  // (Modal.jsx:13-18). The action is bound to the modal box; handler closes it.
  function handleClickOutside() {
    if (isOpen) {
      onClose();
      setTimeout(() => (slowClose = false), 500);
    }
  }

  // useEffect([isOpen]) (Modal.jsx:20-28): open → show; close → hide after 500ms.
  $effect(() => {
    if (isOpen) {
      slowClose = true;
    }
    if (!isOpen) {
      setTimeout(() => (slowClose = false), 500);
    }
  });

  // extract the key value pairs from the textContent object from Chat.json
  const TitleList = Object.keys(textContent.howToAsk);
  const contentList = Object.values(textContent.howToAsk);

  function updateIndex(num) {
    // if the index is less than 0, set the index to the last index of the TitleList
    if (index + num < 0) {
      index = TitleList.length - 1;
      return;
    }
    index = (index + num) % TitleList.length;
  }
</script>

<div
  class={`fixed z-50 inset-0 backdrop-blur-[5px] bg-primary bg-opacity-25 flex justify-center items-center transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'} ${!slowClose ? 'invisible' : ''}`}
>
  <div
    use:clickOutside={handleClickOutside}
    class="w-[832px] bg-white backdrop-blur-md rounded-3xl relative bg-opacity-50"
  >
    <!-- TitleBar -->
    <div class="flex flex-row items-center justify-between px-5 py-4">
      <h2 class="text-2xl font-russoOne">How to ask?</h2>
      <button class="" onclick={onClose}>
        <XIcon class="text-dark-grey px-[1px] hover:text-primary duration-300" size="32" strokeWidth={3} />
      </button>
    </div>

    <div class="min-h-[324px] flex flex-row w-full">
      <div class="w-9/12 bg-white px-6 pt-6 pb-4 rounded-3xl">
        <!-- Direction -->
        <div class="flex flex-col justify-between h-full items-start">
          <h3 class="font-russoOne text-xl mb-3">{TitleList[index]}</h3>
          <ul class="font-nunito ps-6 pl-6 list-disc list-outside space-y-[6px]">
            {#each contentList[index] as content}
              <li>{content}</li>
            {/each}
          </ul>
          <button
            onclick={() => updateIndex(-1)}
            class="mt-auto text-grey font-russoOne text-xl hover:text-primary duration-300 ease-in-out"
          >
            Previous
          </button>
        </div>
      </div>
      <div class="w-4/12 bg-primary rounded-3xl">
        <!-- NextButton -->
        <button
          onclick={() => updateIndex(1)}
          class="w-full h-full px-6 pt-6 pb-4 flex flex-col justify-between items-end group"
        >
          <h3 class="font-russoOne text-white text-xl text-end">
            {TitleList[(index + 1) % TitleList.length]}
          </h3>
          <h3 class="text-white font-russoOne text-xl group-hover:text-grey duration-300 ease-in-out">
            Next
          </h3>
        </button>
      </div>
    </div>
  </div>
</div>
