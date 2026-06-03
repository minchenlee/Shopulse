<script>
  // L5.4 — a product card in the buffer (Buffer.jsx:144-230 `ProductCard`).
  //
  // D6 — the React card fired the composer's send by flipping `shouldClick` and
  // letting a useEffect call `sendMessageButtonRef.current.click()` (Buffer.jsx:166-172).
  // That cross-component DOM-click is REPLACED by a direct store call: set the query
  // into session.userInput (so the textarea reflects it, matching React's setUserInput)
  // then `session.sendMessage()` (which reads userInput and clears it). Same UX, no
  // ref-click. The shouldClick state + its effect are therefore GONE.
  //
  // Carried quirk (D11): deletion keys on `product.name` while the buffer de-dups on
  // `product.id` — the name-vs-id inconsistency.
  import { Trash2Icon } from 'svelte-feather-icons';
  import { session } from '../../lib/session.svelte.js';
  // L2's Star.svelte exposes StarRow as the DEFAULT export (a .svelte file has one
  // default component) — import it as default, not named.
  import StarRow from '../gui/Star.svelte';
  import ConfirmToolTip from './ConfirmToolTip.svelte';
  import ChatShortCutJSON from '../../content_data/ChatShortCui.json';

  let {
    index,
    product,
    setLastThirdProductRef,
    isBufferShown = false,
    productListLength,
    deletedProductDict,
    setDeletedProductDict,
  } = $props();

  // Buffer.jsx:150 — the delete-confirm tooltip open state.
  let isConfirmOpen = $state(false);

  // Buffer.jsx:155-158 — adjust the visible length by however many are deleted in this
  // thread, then decide if THIS card is the "last third" scroll anchor.
  let deleteProductListLength = $derived(
    deletedProductDict[session.currentThreadID]
      ? deletedProductDict[session.currentThreadID].length
      : 0
  );
  let adjustedLength = $derived(productListLength - deleteProductListLength);
  let cardOpacity = $derived(isBufferShown ? 'opacity-100' : 'opacity-0');
  let isLastThird = $derived(adjustedLength - index === 3);

  // Buffer.jsx:161-163 — is this product deleted in the current thread?
  // (keyed on product.name — the name-vs-id quirk, carried.)
  let deletedProductList = $derived(
    Object.keys(deletedProductDict).includes(session.currentThreadID)
      ? deletedProductDict[session.currentThreadID]
      : []
  );
  let isDeleted = $derived(deletedProductList.includes(product.name));

  // the card DOM node; published to Buffer's shared lastThirdProductRef when this is
  // the last-third card (Buffer.jsx:196 ref assignment).
  let cardEl = $state(null);
  $effect(() => {
    if (isLastThird && cardEl) {
      setLastThirdProductRef(cardEl);
    }
  });

  // Buffer.jsx:174-183 — build the shortcut prompt and SEND it (D6: direct store call).
  function handleShortCutClick(productName, shortCut) {
    if (productName.length > 45) {
      productName = productName.slice(0, 45) + '...';
    }

    const productId = product.id;
    const newQuery = shortCut.replace(
      /<product>/g,
      `${productName} <productId>${productId}<productId>`
    );
    // set the composer text (mirrors setUserInput), then send via the store action.
    session.userInput = newQuery;
    session.sendMessage();
  }

  // Buffer.jsx:187-190 — mark this product deleted (push product.name, then spread).
  // Carried verbatim including the in-place push of the existing array.
  function handleDelete() {
    deletedProductList.push(product.name);
    setDeletedProductDict({ ...deletedProductDict, [session.currentThreadID]: deletedProductList });
  }
</script>

{#if !isDeleted}
  <div
    bind:this={cardEl}
    class="scroll-mt-3 flex flex-col rounded-xl border-[1px] border-grey {cardOpacity} w-full min-w-56 transition-opacity duration-1000 mb-2 font-nunito shadow-md relative group"
  >
    <button
      onclick={() => (isConfirmOpen = !isConfirmOpen)}
      class="w-10 h-10 flex items-center justify-center absolute z-20 top-4 right-4 opacity-0 bg-secondary rounded-full p-1 group-hover:opacity-100 hover:scale-110 hover:shadow-md transition-all duration-300 border-primary border-2"
    >
      <Trash2Icon size="24" strokeWidth={2} />
      <ConfirmToolTip
        {isConfirmOpen}
        setIsConfirmOpen={(v) => (isConfirmOpen = v)}
        {handleDelete}
      />
    </button>
    <img src={product.image} alt={product.name} class="w-full px-2 pt-4 object-contain" />
    <div class="flex flex-col px-6 mt-4 pb-4">
      <span class="text-base font-semibold truncate ...">{product.name}</span>
      <div class="flex flex-row flex-wrap items-center justify-between mb-2">
        <span class="text-lg font-extrabold text-primary">${product.price}</span>
        <div class="flex flex-row items-center text-base space-x-2">
          <span class="font-semibold text-primary">{product.rating}</span>
          <StarRow rating={product.rating} />
          <span class="font-semibold text-primary">{product.reviewCount}</span>
        </div>
      </div>
      <div class="flex flex-row items-center justify-evenly text-lg font-bold">
        <button
          onclick={() => handleShortCutClick(product.name, ChatShortCutJSON.Details)}
          class="w-full py-1 border-[1px] bg-white border-grey rounded-l-full hover:shadow-sm hover:bg-light-silver transition-all duration-300"
        >
          Details
        </button>
        <button
          onclick={() => handleShortCutClick(product.name, ChatShortCutJSON.Reviews)}
          class="w-full py-1 border-[1px] bg-white border-grey rounded-r-full hover:shadow-sm hover:bg-light-silver transition-all duration-300"
        >
          Reviews
        </button>
      </div>
    </div>
  </div>
{/if}
