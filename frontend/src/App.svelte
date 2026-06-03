<script>
  // Router: svelte-routing (decision D1). Verified on the empty shell at S3.
  import { Router, Route } from 'svelte-routing'
  import { Toaster, toast } from 'svelte-sonner'

  import './App.css'
  // react-toastify CSS (App.jsx:6) is DROPPED per the plan (svelte-sonner ships
  // its own styles).
  // svelte-medium-image-zoom base styles + our re-pointed override (D5). The lib
  // does NOT auto-inject its CSS, so it is side-imported once here at the app root
  // (mirrors React App.jsx:7). The override must load AFTER the base so it wins.
  import 'svelte-medium-image-zoom/dist/styles.css'
  import './components/medium-image-zoom.css'

  import Layout from './layout/Layout.svelte'
  import ChatPage from './page/Chat.svelte'
  import GuiPage from './page/Gui.svelte'
  import GuiProductDetail from './page/GuiProductDetail.svelte'
  import HybridPage from './page/Hybrid.svelte'

  // The module-singleton rune store (L1.3) replaces App.jsx's <UserSessionProvider>
  // wrapper — components import `session` directly, no provider needed.
  import { session, registerToast } from './lib/session.svelte.js'
  import { fetchData } from './lib/api.js'

  // svelte-routing needs `url` only for SSR; SPA leaves it empty.
  // (runes mode — this file uses $effect — so the prop is $props(), not `export let`.)
  let { url = '' } = $props()

  // Hand the store its toast fn (it stays DOM-free so it can be unit-imported).
  // Mirrors the React `toast.error(...)` calls in login()/sendMessage().
  registerToast((msg) => toast.error(typeof msg === 'string' ? msg : String(msg)))

  // ---- Top-level effects (the React useEffects that watched store state). ----
  // These live here, not in the store, because a module-level `$effect` needs an
  // effect root (this component provides one). They call into the store actions.

  // Mount bootstrap: the storedTime / SHOPULSE reads (UserSessionContext.jsx:43-56)
  // + the login-on-location effect (:167-176). Runs once.
  $effect(() => {
    session.bootstrapFromStorage()

    if (localStorage.getItem('SHOPULSE') !== null) {
      const storedUserID = JSON.parse(localStorage.getItem('SHOPULSE')).userID
      if (storedUserID !== null) {
        session.login(storedUserID)
        session.isLoginModalOpen = false
      }
    }
  })

  // CUI: when currentThreadID changes, load that thread's history.
  // React opened an EventSource that re-emitted the full messages frame on connect
  // (UserSessionContext.jsx:182-219). The GET endpoint is gone; the faithful
  // equivalent is a one-shot history fetch wrapped into the canonical store shape
  // ({ data:{ data:[…newest-first…] } }) so currentMessages.data.data resolves (R2).
  // The LIVE turn is driven by session.sendMessage() (streamChat), not here.
  $effect(() => {
    const threadId = session.currentThreadID
    if (!threadId) return

    let cancelled = false
    ;(async () => {
      try {
        // GET /chat/threads/messages returns a BARE newest-first array (worker
        // chat.js:139). Wrap it so .data.data resolves to that array.
        const dataList = await fetchData('/chat/threads/messages?threadId=' + threadId)
        if (cancelled) return
        // re-inflate each row's content to the { content:[{text:{value}}] } envelope
        // the parser/Threads consume (the GET flattened content to a string at :126).
        const messages = (dataList ?? []).map((m) => ({
          ...m,
          content: typeof m.content === 'string'
            ? [{ type: 'text', text: { value: m.content } }]
            : m.content,
        }))
        session.setCurrentMessages({ type: 'messages', data: { data: messages } })
      } catch (error) {
        // faithful port: the old EventSource toasted a connection failure here.
        toast.error('Failed to connect to the server')
      }
    })()

    return () => { cancelled = true }
  })

  // when currentMessages changes, refresh the thread list (UserSessionContext.jsx:234-238).
  $effect(() => {
    const cm = session.currentMessages
    if (cm && cm.data) {
      session.updateThreadsList()
    }
  })

  // timeLeft === 0 → open the times-up modal (UserSessionContext.jsx:84-88).
  $effect(() => {
    if (session.timeLeft === 0) {
      session.isTimesUp = true
    }
  })

  // productDataList / isLoadingData → hasResult (UserSessionContext.jsx:243-255).
  $effect(() => {
    const list = session.productDataList
    if (list && list.length > 0) {
      session.hasResult = true
    } else {
      session.hasResult = false
    }
    if (session.isLoadingData) {
      session.hasResult = true
    }
  })
</script>

<Router {url}>
  <!-- /chat (bare) -->
  <Route path="/chat"><ChatPage /></Route>

  <!-- /gui under <Layout>, with nested products/:productId.
       svelte-routing nests via a Layout that renders its own <Router>. -->
  <Route path="/gui/*">
    <Layout>
      <Router>
        <Route path="/"><GuiPage /></Route>
        <Route path="/products/:productId" let:params>
          <GuiProductDetail productId={params.productId} />
        </Route>
      </Router>
    </Layout>
  </Route>

  <!-- /hybrid (bare) -->
  <Route path="/hybrid"><HybridPage /></Route>
</Router>

<!-- Single app-root Toaster (decision D2 / L7.2): replaces React's Layout
     <Toaster> + the scattered <ToastContainer/>s (Header/Chat/Hybrid/Gui/
     GuiProductDetail). top-center matches the React toasts' position option. -->
<Toaster position="top-center" />
