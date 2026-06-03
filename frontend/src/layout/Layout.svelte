<script>
  // L2.2 — port of layout/Layout.jsx. Wraps the /gui routes: <Header/> + the
  // nested route content. React's <Outlet/> → {@render children()} (App.svelte
  // passes the matched nested <Route> as children).
  // The React Layout's <Toaster from 'react-hot-toast'/> is DROPPED here — the
  // single app-root <Toaster/> lives in App.svelte (decision D2 / L7.2).
  import Header from '../components/Header.svelte'

  let { children } = $props()
</script>

<Header />
{@render children()}
