<script>
  // L5.1 — a single rendered chat message (Message.jsx).
  //
  // React wrapped the default export in `memo(Message, isEqual)` (react-fast-compare);
  // per D11 that memoization is DROPPED (Svelte re-renders are fine-grained — no memo).
  //
  // The render leaf: ProfileImage + name header + optional Carousel (productList) +
  // optional StatisticBlock (productReview) + the markdown body. The `<productId>…
  // <productId>` system markers are stripped before render (Message.jsx:32). Per-tag
  // markdown class parity lives in the scoped `.markdown` CSS (D4, index.css).
  import ProfileImage from './ProfileImage.svelte';
  import Carousel from './Carousel.svelte';
  import StatisticBlock from '../gui/StatisticBlock.svelte';
  import { renderMarkdown } from '../../lib/markdown.js';
  import { session } from '../../lib/session.svelte.js';

  // Message.jsx:8 — the hardcoded markdown sample, carried verbatim as the
  // `props.message || mdText` fallback (faithful port: pre-existing dead-ish default).
  const mdText =
    'I found some LG OLED TVs with 4K resolution within your price range of $500 to $1500. Here are a few options for you to consider:\n\n### 1. LG C2 Series 42-Inch Class OLED evo Smart TV OLED42C2PUA, 2022\n   - **Price:** $989.95\n   - **Screen Size:** 42 Inches\n   - **Resolution:** 4K\n   - **Refresh Rate:** 120 Hz\n   - **Special Features:** Self-lit OLED technology, α9 Gen 5 AI Processor 4K, Filmmaker Mode, Dolby Enhancements, LG Game Optimizer\n   - **Smart TV Platform:** WebOS\n   - **Supported Services:** Prime Video, Netflix, HBO Max, Apple TV, Disney+, and more\n\n ### 2.  LG C2 Series 48-Inch Class OLED evo Smart TV OLED48C2PUA, 2022\n   - **Price:** $1044.95\n   - **Screen Size:** 48 Inches\n   - **Resolution:** 4K\n   - **Refresh Rate:** 120 Hz\n   - **Special Features:** Pixel Level Dimming, Cinema HDR, Room to Room Share, Dynamic Tone Mapping Pro, Wide Viewing Angle\n   - **Smart TV Platform:** WebOS\n   - **Supported Services:** Netflix, HBO Max, Prime Video, Disney+, Apple TV, Hulu, and more\n\n ### 3. LG C3 Series 48-Inch Class OLED evo Smart TV OLED48C3PUA, 2023\n   - **Price:** $996.99\n   - **Screen Size:** 48 Inches\n   - **Resolution:** 4K\n   - **Refresh Rate:** 120 Hz\n   - **Special Features:** LG OLED evo, Ultra Slim Design, webOS 23 & LG Channels, Dolby Vision + Home Theater, Ultimate Gaming\n   - **Smart TV Platform:** WebOS\n   - **Supported Services:** HBO Max, Netflix, Prime Video, Disney Plus, Apple TV, and more\n\nYou can explore these models for detailed specifications and decide which one aligns best with your preferences and budget. Let me know if you need more information or assistance! ';

  let {
    role = 'assistant',
    message = '',
    productList = [],
    productReview = null,
    filteringCondition = null,
    isForHybrid = false,
    isLastMessage = false,
  } = $props();

  // Message.jsx:12-19 — faithful defaulting ($derived so they track the props,
  // matching React's per-render recompute).
  let name = $derived(role === 'assistant' ? 'Max' : 'You');
  let list = $derived(productList || []);
  // type = productList[0]?.type — computed but only used by the commented-out branch
  // below; carried for fidelity.
  let type = $derived(list[0]?.type);

  // Message.jsx:22 — the message DOM node (useRef → bind:this).
  let messageEl = $state(null);

  // Message.jsx:25-29 — when this is the last message, publish its node to the
  // store's lastMessageRef holder (React: lastMessageRef.current = messageRef.current).
  // Threads/UserInput read session.lastMessageRef for scroll-into-view + the FAB.
  $effect(() => {
    if (isLastMessage && messageEl) {
      session.lastMessageRef = messageEl;
    }
  });

  // Message.jsx:14 + :32 — resolve the text (props.message || mdText), then strip the
  // `<productId>…<productId>` system markers so they aren't displayed. $derived keeps
  // it reactive to streamed message updates.
  let cleanMessage = $derived(
    (message || mdText).replace(/<productId>([a-zA-Z0-9]+)<productId>/g, '')
  );

  // Sanitized markdown HTML for {@html} (D3). The per-tag classes react-markdown
  // injected (Message.jsx:35-39 customParagraphRenderer) are reproduced by the
  // `.markdown` scoped CSS on the wrapper below (D4).
  let html = $derived(renderMarkdown(cleanMessage));
</script>

<div
  bind:this={messageEl}
  class="scroll-mt-16 w-full mx-auto mb-6 md:max-w-3xl flex flex-row space-x-3 font-nunito text-base text-primary"
>
  <ProfileImage {role} />
  <div class="flex flex-col w-11/12">
    <div class="h-[28px] flex items-center font-extrabold text-base">
      <span>{name}</span>
    </div>
    {#if list.length > 0}
      <Carousel productList={list} />
    {/if}
    <!-- Message.jsx:53-55 — commented-out dead branch, carried verbatim:
    {#if list.length > 0 && isForHybrid && type === 'productDetail'}
      <Carousel productList={list} />
    {/if}
    -->
    {#if productReview}
      <StatisticBlock
        {isForHybrid}
        rating={productReview.rating}
        reviewCount={productReview.reviewCount}
        ratingDistributionList={productReview.ratingDistributionList}
      />
    {/if}
    <div class="markdown">
      {@html html}
    </div>
  </div>
</div>
