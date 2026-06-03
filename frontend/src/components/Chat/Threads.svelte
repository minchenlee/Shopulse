<script>
  // L5.3 — the message thread (Threads.jsx:19-251 `Threads`).
  //
  // The metadata→productList parsing that React did inline (Threads.jsx:67-149) is
  // now the pure `lib/parseMessages.js` (L0.2) — consumed here, NOT re-implemented.
  // It returns { messageList (oldest-first), filteringCondition, allProductList } and
  // is immutable (numeric img_list sort, R4).
  //
  // Three render branches carried from React: empty thread (WelcomingMessage), the
  // hybrid layout (thread + Buffer pane), and the plain chat layout.
  import { ChevronLeftIcon, ChevronRightIcon } from 'svelte-feather-icons';
  import { session } from '../../lib/session.svelte.js';
  import { parseMessages } from '../../lib/parseMessages.js';
  import Message from './Message.svelte';
  import MessageStatus from './MessageStatus.svelte';
  import Buffer from '../hybrid/Buffer.svelte';
  import WelcomingMessage from './WelcomingMessage.svelte';

  let {
    isForHybrid = false,
    isBufferShown = false,
    setIsBufferShown = () => {},
  } = $props();

  // Threads.jsx:21 — local loading flag (the typing indicator gate).
  let isLoading = $state(false);

  // Threads.jsx:28-29 — pane widths driven by isBufferShown.
  let messageWidth = $derived(isBufferShown ? 'w-3/4 ps-40' : 'w-full');
  let bufferWidth = $derived(isBufferShown ? 'w-1/4 lg:max-w-[380px] 2xl:max-w-full' : 'w-0');

  // Threads.jsx:56 — render nothing until a frame has arrived.
  let hasMessages = $derived(Object.keys(session.currentMessages).length !== 0);

  // Parse the current frame into the render model. Guarded on hasMessages so
  // parseMessages only runs once `.data.data` exists (Threads.jsx:67 onwards).
  let parsed = $derived(
    hasMessages
      ? parseMessages(session.currentMessages)
      : { messageList: [], filteringCondition: undefined, allProductList: [] }
  );
  let messageList = $derived(parsed.messageList);
  let filteringCondition = $derived(parsed.filteringCondition);
  let allProductList = $derived(parsed.allProductList);

  // Threads.jsx:32-52 — the scroll + loading + auto-open-buffer effect. React keyed
  // [currentMessages, messageStatus, isLoading]; here the $effect reads the same store
  // values so it re-runs on each. Order and conditions carried verbatim (R1).
  $effect(() => {
    // read deps so the effect tracks them
    const _cm = session.currentMessages;
    const status = session.messageStatus;
    const event = session.currentEvent;

    // Default: scroll the last message into view (all scenarios).
    const lastMessageRefCurrent = session.lastMessageRef;
    if (lastMessageRefCurrent) {
      lastMessageRefCurrent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // If not 'completed', we're awaiting new messages → loading true.
    if (status !== 'completed') {
      isLoading = true;
    }

    if (event && event.type === 'messages') {
      // messages frame arrived → loading false; maybe auto-open the buffer (hybrid).
      isLoading = false;
      const latestMessage = session.currentMessages.data.data[0];
      if (latestMessage.metadata.tool_call_name === 'filter_products' && isForHybrid) {
        setIsBufferShown(true);
      }
    }
  });
</script>

{#if hasMessages}
  {#if messageList.length === 0}
    <!-- Threads.jsx:152-184 — empty thread: WelcomingMessage (+ hybrid buffer toggle). -->
    <div class="flex flex-row h-full w-full">
      <div
        class="h-full {messageWidth} pt-[92px] pb-20 flex flex-col overflow-scroll duration-500 relative"
      >
        <WelcomingMessage />
      </div>
      {#if isForHybrid}
        <span class="z-30 relative">
          <button
            onclick={() => setIsBufferShown(!isBufferShown)}
            class="step-eight w-20 h-20 opacity-80 bg-secondary text-primary font-nunito font-bold rounded-full ps-2 flex items-center border-primary border-[1px] shadow-md hover:shadow-xl hover:scale-110 hover:opacity-100 transition-all duration-300 absolute top-1/2 right-0 translate-x-1/2"
          >
            {#if isBufferShown}
              <ChevronRightIcon size="36" strokeWidth={4} />
            {:else}
              <ChevronLeftIcon size="36" strokeWidth={4} />
            {/if}
          </button>
        </span>
        <div
          class="z-40 {bufferWidth} pt-20 bg-white border-grey border-l-[1px] duration-500 shadow-[inset_1px_0px_22px_-1px_rgba(0,0,0,0.2)]"
        >
          <Buffer productList={allProductList} {isBufferShown} {filteringCondition} />
        </div>
      {/if}
    </div>
  {:else if isForHybrid}
    <!-- Threads.jsx:187-230 — hybrid layout: thread + buffer pane. -->
    <div class="flex flex-row h-full w-full">
      <div
        id="thread"
        class="h-full {messageWidth} pt-[92px] pb-20 flex flex-col overflow-scroll duration-500 relative"
      >
        {#each messageList as message, index (index)}
          <Message
            role={message.role}
            message={message.content[0].text.value}
            productList={message.productList}
            productReview={message.metadata.product_review &&
              JSON.parse(message.metadata.product_review)}
            {isForHybrid}
            isLastMessage={index === messageList.length - 1}
          />
        {/each}
        {#if isLoading}
          <MessageStatus name="Max" role="assistant" status={session.messageStatus} />
        {/if}
      </div>
      <span class="z-30 relative step-eight">
        <button
          onclick={() => setIsBufferShown(!isBufferShown)}
          class="w-20 h-20 opacity-80 bg-secondary text-primary font-nunito font-bold rounded-full ps-2 flex items-center border-primary border-[1px] shadow-md hover:shadow-xl hover:scale-110 hover:opacity-100 transition-all duration-300 absolute top-1/2 right-0 translate-x-1/2"
        >
          {#if isBufferShown}
            <ChevronRightIcon size="36" strokeWidth={4} />
          {:else}
            <ChevronLeftIcon size="36" strokeWidth={4} />
          {/if}
        </button>
      </span>
      <div
        class="z-40 {bufferWidth} pt-20 bg-white border-grey border-l-[1px] duration-500 shadow-[inset_1px_0px_22px_-1px_rgba(0,0,0,0.2)]"
      >
        <Buffer productList={allProductList} {isBufferShown} {filteringCondition} />
      </div>
    </div>
  {:else}
    <!-- Threads.jsx:233-250 — plain chat layout. -->
    <div id="thread" class="h-full w-full pt-[92px] pb-20 flex flex-col overflow-scroll">
      {#each messageList as message, index (index)}
        <Message
          role={message.role}
          message={message.content[0].text.value}
          productList={message.productList}
          isLastMessage={index === messageList.length - 1}
        />
      {/each}
      {#if isLoading}
        <MessageStatus name="Max" role="assistant" status={session.messageStatus} />
      {/if}
    </div>
  {/if}
{/if}
