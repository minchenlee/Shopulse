# Track D — React 18 → Svelte 5 (runes) on Cloudflare Pages

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`). DESIGN-ONLY plan — surface decisions at the sign-off gate (§3) BEFORE writing Svelte. The faithful-port mandate is absolute: **no UX change, no "fixes" to quirky code** (carry it verbatim, comment it).

**Goal:** Port `frontend/` (React 18 + Vite + Tailwind, 33 files, ~4444 LOC) to a **plain Vite + Svelte 5 (runes) SPA on Cloudflare Pages**, faithfully. The backend contract is now STABLE (Tracks A/B/C committed): chat streams over **`POST /chat/messages`** (a fetch-stream `ReadableStream`, NOT `EventSource`); `threadId` is a Supabase conversation UUID; products/user routes unchanged.

> **SUPERSEDES nothing; INHERITS spec §4.4 verbatim.** All library swaps, the rune-store decision, the `lib/` extractions, and the SSE-rewrite framing in §4.4 are carried, not relitigated. Where Track C changed the backend (Chat Completions on Groq, not Responses API), the **frontend frame contract is unchanged** — see "Frame contract" below.

---

## Verified facts (read from source, 2026-06-03)

These are confirmed against the actual files — do not re-litigate:

1. **The old transport is `EventSource` GET** at `UserSessionContext.jsx:188` (`new EventSource(baseURL + '/chat?threadId=' + currentThreadID)`). That GET endpoint is DELETED backend-side. Track D MUST replace it with a `fetch`-POST `ReadableStream` reader on `POST /chat/messages`. **This is the single most important transport change** (spec §6.3-A).
2. **Frame contract (from Track C plan line 20, must stay identical):** the `messages` SSE frame payload is `{ data: [ {id, role, content:[{type:'text',text:{value}}], metadata, created_at}, … ] }`, **newest-first**. `runStatus` frames carry `data.data.status`. `UserSessionContext` reads `data.type` (`runStatus` | `messages` | `confirmation`); `Threads.jsx` reads **`currentMessages.data.data`** (array), reverses it, and per message reads `message.role`, **`message.content[0].text.value`**, `message.metadata` (flat blob), and `latestMessage = currentMessages.data.data[0]`. **So the store's `currentMessages` must resolve `.data.data` to the newest-first array** — the POST-stream reader wraps each `messages` frame so `setCurrentMessages(frame)` keeps `frame.data.data` valid. (Contract mismatch B below.)
3. **`Threads.jsx` parser (lines 67-149) is PURE JS and MUTATES** `message.productList=` (line 144) while accumulating `allProductList` across the `.map`. `img_list_*` keys are concatenated in `Object.keys` order (104-106) and index-paired to id/name/price/rating/reviewCount (123-133). Extract to `lib/parseMessages.js` returning **new** objects (immutable out), and **sort `img_list_N` keys numerically** (not Object.keys order).
4. **`Gui.jsx` filter helpers (558-767) use the JS comma operator** (`return queryDict, isProcessed` at 727/747/766 — these "return `isProcessed`" and rely on `queryDict` being mutated by reference). This is a real quirk; `lib/filterQuery.js` must reproduce it byte-for-byte or replace it with explicit `{queryDict, isProcessed}` returns **proven equivalent by golden URL tests** (§4). `removeExistingKeyValue` encodes space as `%20` (line 715) but `mergeExistingKey` does not (742-745) — the encoding asymmetry means a space-containing value toggles ON but won't toggle OFF. **Carry the asymmetry; pin it with a golden test so the port doesn't accidentally "fix" it.**
5. **axios error shape:** callers read `error.response.data.error` (e.g. `Chat.jsx:138`, `Hybrid.jsx:147`). Native `fetch` has no `.response` and doesn't throw on 4xx/5xx. The fetch wrapper MUST throw a normalized error preserving `{response:{data}}` OR every catch site changes — pick ONE (decision D7).
6. **`getApiUrl()` multi-Lambda switch** (`api.jsx:5-18`, `VITE_CHAT_STREAM_URL`/`VITE_PRODUCTS_URL`/…) is DEAD under the unified Worker (Tracks B/C). Collapse to a single `VITE_API_BASE_URL`.
7. **`tailwind.config.js`** is `important: true` with a custom palette (primary `#343434`, secondary `#EBE2D4`, …), `fontFamily.russoOne`/`nunito`, custom `boxShadow`/`animation`/`keyframes`. **Ports verbatim — only the `content` glob changes** (`./src/**/*.{js,svelte}`). Biggest single de-risking fact (~4444 class strings copy across).
8. **Routes** (`App.jsx`): `/chat` (bare), `/gui` (under `<Layout>`, nested `products/:productId`), `/hybrid` (bare). `<UserSessionProvider>` wraps `<RouterProvider>`. Side-imports: `App.css`, `react-toastify` CSS (DROP), `react-medium-image-zoom.css` (re-point, decision D5).
9. **Dead/quirky code to CARRY (not fix):** `DeletingModal.jsx` is byte-identical to `Modal.jsx` (no importers) — do not port separately; `HistoryButton.handleDelete` references `toast`/`createNewThread` without importing them (latent crash path); `threadsList` is object-keyed in places, array-filtered in others; `Message.jsx:8` unused `mdText`; `DummyData` (Gui.jsx:15), `useLocation`/`FeatherIcon` dead imports; `useClickOutside`/`useCursorInside` imported-but-unused in several files; `react-scroll`/`react-fast-compare` deletable.

---

## 1. Project scaffold

Target dir: new Svelte project replaces `frontend/src/**`. Keep `frontend/` as the package root (CF Pages build dir). Branch off `feat/backend`.

- [ ] **S1.** Scaffold Vite + Svelte 5: `npm create vite@latest . -- --template svelte` (in a scratch dir, then merge), or hand-write `package.json` deps: `svelte@^5`, `@sveltejs/vite-plugin-svelte`, `vite@^5`. Confirm Svelte major is 5 (runes).
- [ ] **S2.** Tailwind: install `tailwindcss@^3.4` + `postcss` + `autoprefixer` (already deps). Copy `tailwind.config.js` **verbatim**; change only `content` → `['./index.html','./src/**/*.{js,svelte}']`. Copy `postcss.config.js` and `src/index.css` (the `@tailwind` directives + any custom CSS) verbatim. Verify a trivial `bg-primary` class renders the custom `#343434`.
- [ ] **S3.** Router: install the chosen router (decision D1; default `svelte-routing`). Define `/chat`, `/gui` (+ nested `/gui/products/:productId` under `Layout`), `/hybrid` in `App.svelte`. Add `public/_redirects` with the single line `/*  /index.html  200` (CF Pages SPA fallback).
- [ ] **S4.** `vite.config.js`: drop the React plugin + the `manualChunks` React/router split; add `svelte()` plugin. Keep `base: '/'`. Drop `build:staging`/`deploy:s3` scripts (S3 is dead); keep `dev`/`build`/`preview`. Add `vitest` config (decision D8 / §4).
- [ ] **S5.** `.env.example`: single `VITE_API_BASE_URL`. Delete the `VITE_CHAT_STREAM_URL`/`VITE_PRODUCTS_URL`/`VITE_USER_URL`/`VITE_CHAT_THREADS_URL` quartet.
- [ ] **S6.** `main.js` (was `main.jsx`): `import { mount } from 'svelte'; import App from './App.svelte'; import './index.css'; mount(App, { target: document.getElementById('root') })`. Keep `index.html` `<div id="root">`.
- [ ] **S7.** Build gate: `npm run build` succeeds on the empty shell before porting any feature. ESLint: swap `eslint-plugin-react*` for `eslint-plugin-svelte` (or drop lint to a follow-up; not load-bearing).

---

## 2. Dependency-ordered task list

**Strict order. Each layer is verifiable before the next depends on it.** Lib extractions are framework-agnostic and unit-testable in plain Node — they land FIRST so the store and components consume known-good logic.

### Layer 0 — framework-agnostic lib extractions (testable in isolation, no Svelte)

- [ ] **L0.1 `lib/filterQuery.js`** — lift `Gui.jsx:558-767` verbatim: `handleOptionChange` (minus the `navigate` call — return the new URL string instead, caller navigates), `listDictConverter`, `removeExistingKeyValue`, `mergeExistingKey`, `processRangeValue`, `normalzedTitle` (keep the typo'd name). **Preserve the comma-operator semantics** (or convert to explicit object returns, gated on golden tests passing identically). Export `buildFilterUrl(parameterKey, optionValue, currentSearch) → newUrlString`.
- [ ] **L0.2 `lib/parseMessages.js`** — lift `Threads.jsx:67-149` as a PURE function `parseMessages(currentMessages) → { messageList, filteringCondition, allProductList }`. **Return NEW message objects** (`{...message, productList}`), do NOT mutate. **Sort `img_list_N` keys numerically** before concat (risk: backend key order). `filtering_condition` JSON.parse, `tool_call_name` branch (`filter_products` → full product objects type:`'product'`; `get_product_details` → `{image,type:'productDetail'}`), accumulate `allProductList` filtered to `type==='product'`.
- [ ] **L0.3** Other pure helpers used by components, kept verbatim: `Message.jsx:32` `<productId>` marker-strip regex; `Buffer.jsx:174-183` `handleShortCutClick` template `.replace` of `<product>`/`<productId>` from `ChatShortCui.json`; `HistoryButton` date/time `toLocale*` formatting; `MessageStatus.jsx:12-22` runStatus→label map. Put in `lib/` if shared, else inline at the consuming `.svelte`.

### Layer 1 — the rune session store (the spine; everything else is store-coupled)

- [ ] **L1.1 `lib/api.js`** (was `api.jsx`) — axios → native `fetch`. 4 verbs (`fetchData`/`postData`/`putData`/`deleteData`) + `chatAPI`/`productsAPI`/`userAPI` groups. **Collapse `getApiUrl` to single `VITE_API_BASE_URL`** (drop the service switch). **Normalize errors** to `{response:{data}}` shape (decision D7) so `error.response.data.error` callers survive. `fetch` must throw on non-2xx (it doesn't by default). Auto-JSON. Keep `URLSearchParams` query building.
- [ ] **L1.2 `lib/streamChat.js`** — THE transport rewrite. A function that does `fetch(BASE+'/chat/messages', {method:'POST', body, headers})`, reads `response.body.getReader()`, decodes the SSE text stream, splits on `\n\n`, parses each `data:` line to a frame, and invokes callbacks `onRunStatus(status)` / `onMessages(frame)` / `onError`. **Must emit the SAME store transitions in the SAME order the old `EventSource.onmessage` did** (`setCurrentEvent` → `setCurrentMessages`/`setMessageStatus`), or the loading spinner, status label, and auto-open-buffer break. Handle `:ping` keep-alive comment frames (ignore). No reconnect (the old code had none — faithful).
- [ ] **L1.3 `lib/session.svelte.js`** — module-singleton rune store porting `UserSessionContext.jsx` (317 LOC). `useState`→`$state`; the timer `setInterval` (59-80) stays here; `login`/`logout`/`updateThreadsList` stay; refs (`textAreaRef`/`sendMessageButtonRef`/`lastMessageRef`) → exported `$state` holders bound via `bind:this` in components. **Expose a `sendMessage()` action** (decision D6 — replaces Buffer's `sendMessageButtonRef.click()` anti-pattern). The `localStorage` reads (`SHOPULSE`, `SHOPULSE_TIMER`, `SHOPULSE_IS_TIMES_UP`) carry verbatim. **The SSE lifecycle `$effect` does NOT live here** (module-level `$effect` needs an effect root) — it lives in `App.svelte` (L1.4), keyed on `currentThreadID`, calling `streamChat`/history-fetch.
- [ ] **L1.4 `App.svelte`** — router shell + the top-level SSE/session `$effect`. On `currentThreadID` change: fetch history via `GET /chat/threads/messages` and wire `streamChat` for the live POST. Mount the single `<Toaster/>` (decision D2). Re-point/keep zoom CSS (decision D5). Drop toastify CSS.

> **Gate G1:** store + transport verified by the live smoke (§4.3) against the running Worker BEFORE any chat component is ported. If the frame doesn't resolve `currentMessages.data.data`, fix the store shape here — not in 8 downstream components.

### Layer 2 — leaf components (presentational, low risk)

- [ ] **L2.1** Trivial copies: `svg/logo.jsx`→`Logo.svelte` (camelCase SVG attrs → kebab), `Chat/NavButton`, `Chat/ProfileImage`, `Chat/LoadingIndicator` (keep `ldrs` `dotPulse.register()` + `<l-dot-pulse>`), `gui/Star` (`StarRow` SVGs, shared by Buffer + StatisticBlock).
- [ ] **L2.2** Mechanical: `Chat/MessageStatus` (runStatus→label `$derived`, `ldrs`), `gui/StatisticBlock` (two layouts via `isForHybrid`, inline `style:width`), `gui/ProductCard`, `gui/Searchbar` (step-one anchor), `components/Header` (Link, Logo, Searchbar, Timer; drop stray `<ToastContainer/>`), `components/Timer` (reads store; carries tour anchors step-five/six/seven), `layout/Layout` (`<Outlet/>`→`{@render children()}` or `<slot/>`, single Toaster).

### Layer 3 — hooks → Svelte actions/inline

- [ ] **L3.1** `hooks/useClickOutside.jsx` → `lib/clickOutside.js` Svelte action (`use:clickOutside`, returns `{destroy}`). Wire only where actually used (Modal/InstructionModal); leave the dead imports in LoginModal/TimesUpModal unwired (faithful).
- [ ] **L3.2** `hooks/useCursorInside.jsx` → inline `$state(false)` + `onmouseenter`/`onmouseleave` (used in Buffer ConfirmToolTip, HistoryButton ConfirmToolTip). Note it's a dead import in Chat/Hybrid page shells.

### Layer 4 — modals (carousel + markdown)

- [ ] **L4.1** `Modal.svelte` ("How to ask?" carousel), `InstructionModal.svelte`, `LoginModal.svelte` (largest; RegisterForm captures Prolific/userID → `login()`), `TimesUpModal.svelte` (scroll-lock `$effect`, clipboard copy, hardcoded `completionCode 'w96j02u4ux87'`). All: `useState`→`$state`, `useEffect([isOpen])`→`$effect`, FeatherIcon→svelte-feather-icons, react-markdown→`marked`+`{@html}`+sanitize (decision D3/D4). **`DeletingModal.jsx` NOT ported** (duplicate of Modal). Path-sniff `window.location.pathname` for gui-vs-chat content stays.
- [ ] **L4.2** Markdown CSS parity: react-markdown injected per-tag Tailwind classes (h3/p/ol/code in modals; p/ul/li in Message). `marked` has no per-tag class API → reproduce via scoped `.markdown` CSS (`@apply` or descendant selectors) on the `{@html}` wrapper. **Behavioral parity needs this CSS — easy to miss** (decision D4).

### Layer 5 — chat/hybrid components (metadata-driven, store-coupled)

- [ ] **L5.1** `Chat/Carousel.svelte` (scroll-driven `$state` from a scroll handler in `$effect` w/ cleanup; exports BOTH Carousel and `Image` — preserve named export; `<Zoom>` swap, decision D5), `Chat/Message.svelte` (render leaf; marker-strip regex; Carousel/StatisticBlock/Markdown; **delete `memo`**; commented dead branch carried).
- [ ] **L5.2** `Chat/UserInput.svelte` — textarea auto-resize `$effect` + IntersectionObserver `$effect`(cleanup) for scroll-FAB; `handleSubmit` optimistic insert. **Reconcile the dual-shape insert** (`.data.body.data` AND `.data.data` at 71-73) against the canonical store shape from L1.3 (contract mismatch B). Enter/Shift+Enter handling. Calls store `sendMessage()`.
- [ ] **L5.3** `Chat/HistoryButton.svelte` (3 fns; object-keyed `threadsList` map + array filter quirk carried; `handleDelete` missing-import crash path carried; delete→`deleteData` then recompute currentThreadID, fallback createNewThread = store action), `Chat/Threads.svelte` (consumes `lib/parseMessages.js`; `$effect` for scrollIntoView + setIsLoading + auto-open-buffer; `{#if}` empty/hybrid/plain branches; `WelcomingMessage.svelte` — drop the dead `useMemo`s).
- [ ] **L5.4** `hybrid/Buffer.svelte` → 4 files (Buffer/FilterDisplay/ProductCard/ConfirmToolTip + DemoProductCard). localStorage `deletedProductDict` (`$state`+persist `$effect`, **guard first-mount write**); de-dup-by-id `$derived`; `lastThirdProductRef` scroll `$effect` (500ms setTimeout carried); **ProductCard calls store `sendMessage()` directly** (not `sendMessageButtonRef.click()`, decision D6); **delete `memo(Buffer,isEqual)`**. Name-vs-id deletion inconsistency (deletes by `product.name`, de-dups by `product.id`) carried.

### Layer 6 — page shells + the tour

- [ ] **L6.1** `page/Gui.svelte` — the 797-line filter page; query-string-driven, `fetch` effect on `location.search`, `replaceState`-without-reload via the router. Filter engine already extracted (L0.1). `DummyData` (line 15) dead — carry/comment. NoResult img (411) 404s in prod — note, don't fix.
- [ ] **L6.2** `page/GuiProductDetail.svelte` — 14 subcomponents; Details/Spec `scrollTo` first-render guard (`useRef isFirstRender` → `$state` flag, skip first run); `<Zoom>` (111-117). Dynamic Tailwind `mb`/`scale` classes (lines 27/199-201/234) **not emitted by the compiler unless safelisted** — add to a `safelist` in `tailwind.config.js` (the React build leaked them via the JS glob; Svelte's `{class}` expressions may not).
- [ ] **L6.3** `page/Chat.svelte` + `page/Hybrid.svelte` — static layout (trivial) + `createNewThread` (move to store action, max-3 toast) + the Joyride block (the tour, L6.4). Hybrid adds `isBufferShown` `$state` threaded into `<Threads>` and the `userInputWidth` toggle.
- [ ] **L6.4 `lib/tour.js`** — driver.js port (HIGHEST RISK, decision D9). ONE shared tour module + per-page step arrays (Chat 1-7, Hybrid 1-10, Gui 1,2,5,6,7 non-contiguous). Map joyride `steps[].target`→`element`, `content`→`popover.description`, `continuous`→default, `hideCloseButton`+`disableCloseOnEsc`+`disableOverlayClose`→`allowClose:false`+`showButtons` minus close, `spotlightPadding:4`→`stagePadding:4`, `placement:'right'`→`popover.side:'right'`, `disableScrolling`→per-step opt. **The `styles` object (primaryColor #343434, borderRadius 15, Nunito, spotlightShadow) has NO JS-config equivalent → reproduce in driver.js theme CSS** (`.driver-popover` custom classes) or the tour looks different (forbidden UX change). **Hybrid `data.index===6` → open Buffer mid-tour** (so steps 8-10 selectors exist) → a per-step `onHighlightStarted` hook; account for the `duration-1000` Buffer-open animation before spotlighting. **reset vs stop:** `stop` starts the timer exactly once (Hybrid: closes Buffer) → map onto `onDestroyed`/`onDestroyStarted` so the timer fires once.

### Layer 7 — wiring + build

- [ ] **L7.1** Cross-slice **selector inventory**: step-one..step-ten live across Searchbar, Timer, FilteringSidebar, NavButton, UserInput, HistoryButton, Threads, Buffer. Keep a single list; verify every anchor class survived the port (a dropped `step-N` class silently breaks the tour — no error).
- [ ] **L7.2** Toast consolidation: every `toast.*` call re-mapped to the one lib (decision D2); single `<Toaster/>` mount replaces Layout `<Toaster>` + all scattered `<ToastContainer/>` (Header/Chat/Hybrid/Gui/GuiProductDetail).
- [ ] **L7.3** `npm run build` clean; `npm run preview` smoke of all 3 routes + nested detail route; `_redirects` deep-link test.
- [ ] **L7.4** Remove dead deps from `package.json`: `axios`, `react*`, `react-fast-compare`, `react-scroll`, `feather-icons-react`, `react-joyride`, `react-markdown`, `react-toastify`, `react-hot-toast`, `react-medium-image-zoom`. Add the Svelte swaps.

---

## 3. Decision table — sign-off REQUIRED before implementation

Each row is a taste call. **Recommended default + tradeoff. Owner signs off (or overrides) before Layer 1.**

| # | Decision | Recommended default | Tradeoff / why |
|---|---|---|---|
| **D1** | Router | **`svelte-routing` v2.13** | Spec §4.4 names "svelte-routing-style." BUT package metadata declares NO svelte peer dep, last modified 2024-05 — Svelte 5 support is community-reported, NOT guaranteed. Needs nested `/gui/products/:id` + Layout wrapping. **Fallback:** `@mateothegreat/svelte5-router` (Svelte-5-native) or `svelte-spa-router` (hash-based). RISK — verify on the empty shell at S3; pivoting mid-port is costly. |
| **D2** | Toast lib (consolidate 2→1) | **`svelte-sonner` v1.1** | Spec §4.4 leaves it open (sonner OR french-toast). sonner peerDeps `svelte ^5.0.0`, actively maintained (2026-04). french-toast peers only `^3.57\|\|^4.0` — NOT Svelte-5-declared, may need override. react-toastify carries rich per-call options (Tailwind `className`, `position`, `autoClose`, `hideProgressBar`, `closeButton`) that sonner expresses differently → each `toast()` call hand-mapped. **Minor visual drift accepted** (borderline UX change — flag for owner). |
| **D3** | Markdown sanitizer | **`marked` + DOMPurify** | Spec §4.4 mandates "sanitized." `marked` does NOT sanitize by default. Chat message text is model-generated (real XSS surface); modal text is static JSON (low risk but spec says sanitize all). DOMPurify is the standard. **Alt:** marked's allowlist-only config (lighter, less battle-tested). |
| **D4** | Per-tag markdown class parity | **scoped `.markdown` CSS** (`@apply` the exact Tailwind classes onto descendant `p`/`ul`/`li`/`h3`/`ol`/`code`) | react-markdown injected classes per tag (Message: `my-1`/`space-y-2`/`mt-2`; modals: `text-lg`/`list-decimal ms-5 space-y-4` etc). `marked` has no per-tag API. **Alt:** a `marked` custom renderer that emits the classed HTML (more faithful, more code). Getting this wrong silently regresses chat/modal spacing. |
| **D5** | Image zoom + its 97-line CSS | **`svelte-medium-image-zoom` v0.2.6**, **re-point the override CSS selectors** | Component API is drop-in (`<Zoom>` wrap). BUT `react-medium-image-zoom.css` (97 lines, App.jsx:7) targets the React lib's class prefix; after swap those overrides may not match → zoom styling silently breaks in Carousel/GuiProductDetail. **Must verify the override selectors against the Svelte lib's class names.** |
| **D6** | Buffer→send coupling | **expose store `sendMessage()` action; Buffer calls it** | React uses `sendMessageButtonRef.current.click()` (Buffer.jsx:166-172) to fire UserInput's submit — a DOM-click anti-pattern in Svelte. Calling a store action is cleaner, SAME UX. **Changes the store contract** (adds `sendMessage()`), so it's a decision not a silent refactor. Literal `bind:this`+click port also works but is fragile. |
| **D7** | fetch error shape | **wrapper throws `{response:{data}}`-shaped error** | Callers read `error.response.data.error` (Chat:138, Hybrid:147). Preserving the shape means zero catch-site changes; the alternative is editing every catch. One convention, chosen up front. |
| **D8** | Test runner | **vitest** | Native to Vite, runs the pure `lib/` extractions in Node with no browser. Golden cases for `filterQuery` (URL strings) + `parseMessages` (frame→productList). Build gate + live smoke complete the pyramid (§4). |
| **D9** | Tour port (driver.js) | **driver.js v1.4, ONE shared `lib/tour.js` + per-page step arrays** | HIGHEST RISK, no drop-in (imperative `driver({steps}).drive()` vs declarative `<Joyride>`). Three hard gaps: (1) Hybrid's `data.index===6`→open-Buffer side-effect → per-step `onHighlightStarted` (steps 8-10 selectors don't exist until Buffer opens; mind the `duration-1000` animation); (2) the `styles` object → driver.js theme CSS (no JS equivalent); (3) reset-vs-stop → `onDestroyed`/`onDestroyStarted` so the timer starts exactly once. **Alt fallback if driver.js fights the requirements:** Shepherd.js (heavier, closer to joyride's model). |
| **D10** | feather-icons swap | **`svelte-feather-icons` v4.2** (drop-in-ish) | All needed icons confirmed present (Check/X/Search/Send/Copy/Info/ChevronLeft-Right-Down/Trash/Trash2). API differs: `<FeatherIcon icon='x' size='32px' strokeWidth='3px'/>`→`<XIcon size="32" strokeWidth={3}/>` (strip `px`, `className`→`class`). ~10 call sites, per-icon import lines. Low activity (2024-10) but it's static SVG — acceptable. |
| **D11** | Quirky/dead code policy | **carry verbatim, comment `// faithful port: pre-existing quirk`** | Per the faithful-port mandate + CLAUDE.md. Covers: comma-operator filter returns, space-encoding asymmetry, HistoryButton missing imports, object-vs-array `threadsList`, name-vs-id Buffer deletion, `DeletingModal` duplicate (NOT ported), dead imports. **Do NOT silently fix** — fixing changes the research UX. Owner confirms this stance. |

**Decisions needing sign-off: 11.**

---

## 4. Verification plan

### 4.1 Unit (vitest, Node — gates Layer 0)

- [ ] **`lib/filterQuery.test.js`** — golden URL cases ported from real interactions: toggle a checkbox on (fresh key), merge a second value onto an existing key, toggle OFF, range (price/screenSize) min/max promotion, pagination stripping, **the space-encoding asymmetry** (a brand/value with a space toggles ON but the OFF case is a no-op — assert the pre-existing behavior so the port can't accidentally fix it). Each case: `(parameterKey, optionValue, currentSearch) → expected URL string`.
- [ ] **`lib/parseMessages.test.js`** — feed a REAL newest-first `messages` frame captured from the running Worker (§4.3). Assert: `filtering_condition` parsed; `filter_products` message → N product objects with correct image↔id↔name↔price↔rating↔reviewCount pairing; `get_product_details` → `{image,type:'productDetail'}`; `allProductList` = only `type==='product'`; **img_list_N numeric-sort** (craft a frame with `img_list_2` before `img_list_1` in key order → assert correct pairing); **no input mutation** (deep-freeze the input, assert it's untouched).

### 4.2 Build gate

- [ ] `npm run build` exits 0 (after S7 on empty shell, then again at L7.3). No unresolved imports, no missing Tailwind classes (watch for the dynamic `mb`/`scale` safelist gap, L6.2).

### 4.3 Live smoke against the running Worker (gates G1, before Layer 5)

- [ ] Start the Worker locally (`wrangler dev`, Track B/C). From a throwaway Node/browser script: `POST /chat/threads` → capture the conversation UUID. `POST /chat/messages` with that threadId + a real prompt ("show me cheap 4K TVs") → **read the `ReadableStream`**, log every frame. ASSERT: `runStatus` frames arrive first (status transitions), then a final `messages` frame shaped `{ data: [ {role, content:[{text:{value}}], metadata}, … ] }` newest-first; `metadata` carries `tool_call_name`/`img_list_*`/`product_*_list`. **Save this frame as the `parseMessages.test.js` fixture.** This proves the L1.2 reader contract AND seeds the unit test from ground truth.
- [ ] After Layer 5: open `/chat` in `npm run dev`, send a message, confirm the spinner→status-label→message render path matches the React app screenshot-for-screenshot; open `/hybrid`, confirm a `filter_products` reply auto-opens the Buffer.

### 4.4 Full faithful-port QA (after L7)

- [ ] Side-by-side the React app and the Svelte app on all 3 routes + product detail: login modal → tour → search/filter → chat stream → history delete → timer countdown → times-up modal. **Pixel/behavior parity is the acceptance bar** (no UX change). Use the `browse`/`qa` skills for evidence.

---

## 5. Risk register (from surveys + source verification) with mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **R1 — SSE transport rewrite (EventSource→fetch-stream).** The single most important change. If the L1.2 reader doesn't emit `setCurrentEvent`/`setCurrentMessages`/`setMessageStatus` in the SAME order, the spinner, status label, and auto-open-buffer silently break across the whole CUI/Hybrid slice. | **Highest** | Port the reader (L1.2) + store (L1.3) FIRST; gate G1 (live smoke §4.3) before ANY chat component. Seed `parseMessages` fixture from the real frame. No reconnect (faithful). |
| **R2 — Contract/shape mismatch (`currentMessages.data.data` vs `.data.body.data`).** Threads reads `.data.data`; UserInput optimistically inserts into BOTH `.data.data` AND a phantom `.data.body.data` (stale EventSource-era shape). The new frame is `{data:[…]}`; if the store wraps it wrong, `.data.data` is undefined → "cannot read data of undefined". | **Highest** | **Decide the canonical store shape in L1.3 FIRST.** The reader wraps each `messages` frame so `currentMessages.data.data` = newest-first array (matches Track C line 20). Reconcile UserInput's optimistic insert against that one shape; drop the phantom `.data.body.data`. Both `parseMessages` and the insert depend on this one decision. |
| **R3 — driver.js tour.** Spec-flagged highest-risk swap. No mechanical translation; index-based Buffer-open side-effect, no-JS-equivalent styling, reset/stop timer-once semantics, non-contiguous step sets across 3 pages + 8 components. | **High** | L6.4 + D9: ONE `lib/tour.js`, per-page step arrays, per-step `onHighlightStarted` for the Buffer-open, theme CSS for styling, careful `onDestroyed`/`onDestroyStarted` for timer-once. L7.1 selector inventory keeps anchors in sync. Verify the spotlight lands AFTER the `duration-1000` Buffer animation. Fallback: Shepherd.js (D9). |
| **R4 — Threads parser mutation + img_list ordering.** React mutates `message.productList=` and concatenates `img_list_*` in `Object.keys` order, index-pairing to other lists. A different backend key order misaligns image↔name silently. | High | L0.2: pure fn, immutable out, **numeric-sort `img_list_N`**. Unit test with a deliberately out-of-order fixture (§4.1). |
| **R5 — Router Svelte-5 support unverified.** `svelte-routing` declares no svelte peer dep; nested route + Layout wrapping may fight Svelte 5. | High | D1: verify on the empty shell at S3 BEFORE porting pages. Named fallbacks ready (`svelte5-router`/`svelte-spa-router`). A mid-port pivot is the cost of getting this wrong late. |
| **R6 — Toast consolidation behavior drift.** 2 libs → 1; rich react-toastify options don't all map to sonner (no `hideProgressBar`, different class/close model). | Medium | D2: hand-map every call; accept minor visual drift; flag the borderline-UX-change to owner. Single `<Toaster/>` mount (L7.2). |
| **R7 — marked loses per-tag classes + sanitization.** Chat/modal typography regresses without the `.markdown` CSS; model-generated text needs sanitizing. | Medium | D3 (DOMPurify) + D4 (scoped `.markdown` CSS). Cover in the §4.4 side-by-side QA. |
| **R8 — Dynamic Tailwind classes not emitted.** GuiProductDetail/ProductCard build `mb`/`scale` class names dynamically; Svelte compiler won't see them → missing styles. | Medium | L6.2: add `safelist` to `tailwind.config.js` for the dynamic patterns. Build-gate watch. |
| **R9 — axios→fetch error shape.** `error.response.data.error` breaks; fetch doesn't throw on 4xx. | Medium | D7/L1.1: wrapper throws normalized `{response:{data}}` + throws on non-2xx. |
| **R10 — image-zoom CSS override mismatch.** 97-line override targets React lib class names; silent zoom-style break after swap. | Medium | D5: re-point/verify the override selectors against svelte-medium-image-zoom's classes. |
| **R11 — Buffer DOM-click coupling.** `sendMessageButtonRef.click()` cross-component ref-click. | Low-Med | D6: expose store `sendMessage()`; Buffer calls it (cleaner, same UX, store-contract change). |
| **R12 — Dead/quirky code carried as faithful.** Comma-operator returns, space-encoding asymmetry, HistoryButton missing imports, object-vs-array threadsList, name-vs-id Buffer deletion, DeletingModal duplicate, dead imports. | Low (but a trap) | D11: carry verbatim + comment; do NOT fix (fixing changes research UX). Golden tests pin the load-bearing quirks (filter encoding). DeletingModal NOT ported. |
| **R13 — localStorage first-mount clobber (Buffer).** The `deletedProductDict` persist `$effect` could write `{}` on first mount, clobbering stored deletions. | Low | L5.4: guard the persist (React guards with `Object.keys(...).length>0`); carry the guard. |

---

## 6. Out of scope (explicit)

- Any UX/feature change (faithful port only).
- Backend changes (Tracks A/B/C own the contract; Track D consumes it).
- CF Pages custom-domain DNS, the AWS-cleanup commit (`lambda-functions/`, `terraform/`, `Dockerfile`) — separate per spec §9.
- The `DeletingModal.jsx` duplicate — flagged, not ported, not deleted (CLAUDE.md: don't delete unprompted).
