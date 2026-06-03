<script>
  // page/Chat.svelte — L6.3. Faithful port of page/Chat.jsx (the bare /chat CUI
  // shell). Static layout + the "new chat" thread creator + the guided tour.
  //
  // Store coupling: the React page pulled a dozen values off useUserSession();
  // here they come off the module-singleton `session` store (L1.3). The setter props
  // React drilled into HistoryButton (setIsLoadingThread) are gone — Svelte children
  // read the store directly (the L1.3 design), so HistoryButton takes only text/class.
  // React-only dead imports (useNavigate, FeatherIcon, fetchData/deleteData,
  // useCursorInside) are NOT recreated — no Svelte analog; documented per D11.

  import { startTour, chatSteps } from '../lib/tour.js'

  import Logo from '../svg/Logo.svelte'
  import Threads from '../components/Chat/Threads.svelte'
  import Message from '../components/Chat/Message.svelte' // faithful port: dead import (never used, as in Chat.jsx:9)
  import Modal from '../components/modals/Modal.svelte'
  import LoginModal from '../components/modals/LoginModal.svelte'
  import TimesUpModal from '../components/modals/TimesUpModal.svelte'
  import InstructionModal from '../components/modals/InstructionModal.svelte'
  import NavButton from '../components/Chat/NavButton.svelte'
  import HistoryButton from '../components/Chat/HistoryButton.svelte'
  import UserInput from '../components/Chat/UserInput.svelte'
  import LoadingIndicator from '../components/Chat/LoadingIndicator.svelte'
  import Timer from '../components/Timer.svelte'

  import { toast } from 'svelte-sonner'
  import { session } from '../lib/session.svelte.js'
  import { postData } from '../lib/api.js'

  // control modal (Chat.jsx:28-29)
  let isModalOpen = $state(false)
  const toggleModal = () => (isModalOpen = !isModalOpen)

  // Run the tour when isTourStart flips true (replaces Joyride's run={isTourStart}).
  // handleReset's branches (Chat.jsx:32-42) become the onReset/onStop callbacks:
  //   action 'reset' → setIsTourStart(false)
  //   action 'stop'  → start the timer if not already active
  // driver.js fires both via onDestroyed when the tour ends (see lib/tour.js).
  let tourRunning = false
  $effect(() => {
    if (session.isTourStart && !tourRunning) {
      tourRunning = true
      startTour({
        steps: chatSteps,
        onReset: () => {
          session.isTourStart = false
        },
        onStop: () => {
          if (!session.timerActive) {
            session.setTimerActive(true)
          }
          tourRunning = false
        },
      })
    }
  })

  // create a new thread (Chat.jsx:120-146).
  // DEVIATION (noted): the plan said "createNewThread→store action", but the L1.3
  // store is DONE and exposes no createNewThread (in React it was a page-module fn,
  // NOT part of the context). To honor "do NOT rewrite the spine" while staying
  // faithful, it remains a page-local helper consuming store getters/setters —
  // exactly its React altitude. toast.warn → toast.warning (svelte-sonner, D2).
  async function createNewThread() {
    try {
      if (session.threadsList.length === 3) {
        toast.warning('You can only have 3 active threads at a time', {
          className: 'bg-white font-russoOne text-primary rounded-xl border-grey border-[1px]',
          position: 'top-center',
          autoClose: true,
          hideProgressBar: true,
          closeButton: false,
        })
        return
      }

      session.isLoadingThread = true
      const response = await postData('/chat/threads', { userId: session.userID })
      session.currentThreadID = response.threadId
    } catch (error) {
      session.isLoadingThread = false
      toast.warning(error.response.data.error, {
        className: 'bg-white font-russoOne text-primary rounded-xl border-grey border-[1px]',
        position: 'top-center',
        autoClose: true,
        hideProgressBar: true,
        closeButton: false,
      })
    }
  }
</script>

<div class="h-screen min-w-screen overflow-hidden">
  <div class="h-full w-full flex flex-row relative">
    <div class="z-40 absolute top-[18px] right-4">
      <Timer />
    </div>
    <div class="absolute z-30 w-full h-16 bg-white bg-opacity-65 backdrop-blur-[6px]"></div>
    <div class="absolute z-30 h-full ps-8 pt-4 flex flex-col items-start">
      <span class="shadow-md rounded-full">
        <Logo />
      </span>
      <div class="mt-8 flex flex-col items-start space-y-3">
        <NavButton text="how to ask?" onclick={toggleModal} className="step-one" />
        <NavButton text="new chat" onclick={() => createNewThread()} className="step-two" />
        <HistoryButton text="history" className="step-three" />
      </div>
    </div>
    {#if session.isLoadingThread}
      <LoadingIndicator />
    {/if}
    <Threads />
    <div class="absolute z-40 inset-x-3 bottom-0 backdrop-blur-md pb-4">
      <UserInput className="step-four" />
    </div>
  </div>
  <Modal isOpen={isModalOpen} onClose={() => (isModalOpen = false)} />
  <LoginModal isOpen={session.isLoginModalOpen} onClose={() => (session.isLoginModalOpen = false)} />
  <TimesUpModal />
  <InstructionModal />
  <!-- <ToastContainer/> dropped — single app-root <Toaster/> in App.svelte (L7.2). -->
</div>
