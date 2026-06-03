<script>
  // L2.2 — port of components/Header.jsx. The GUI/Hybrid top bar: Logo (links to
  // /gui), Searchbar, and the absolutely-positioned Timer.
  // The stray <ToastContainer/> (Header.jsx:20) is DROPPED — the single app-root
  // <Toaster/> lives in App.svelte (decision D2 / L7.2).
  import { Link } from 'svelte-routing'
  import Logo from '../svg/Logo.svelte'
  import Searchbar from './gui/Searchbar.svelte'
  import Timer from './Timer.svelte'
</script>

<div
  class="h-[78px] w-full z-30 ps-8 p-4 flex items-center justify-start bg-white sticky top-0 border-primary border-b-[1px]"
>
  <div class="z-40 absolute right-4">
    <Timer />
  </div>
  <Link to="/gui" class="shadow-md rounded-full">
    <Logo />
  </Link>
  <Searchbar />
</div>
