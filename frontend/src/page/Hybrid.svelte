<script>
  // page/Hybrid.svelte — L6.3. Faithful port of page/Hybrid.jsx (the bare /hybrid
  // dual-pane shell). Same skeleton as Chat.svelte PLUS:
  //   - isBufferShown $state threaded into <Threads> (Buffer.jsx open/close)
  //   - userInputWidth toggle (w-3/4 ps-40 vs w-full) on the UserInput wrapper
  //   - the 10-step tour with the index-6 Buffer-open side-effect (D9)
  //   - handleReset's 'stop' branch ALSO closes the Buffer
  //
  // React-only dead imports (useNavigate, FeatherIcon, fetchData/deleteData,
  // useCursorInside) are not recreated (no Svelte analog); documented per D11.

  import { startTour, buildHybridSteps } from '../lib/tour.js'

  import Logo from '../svg/Logo.svelte'
  import Threads from '../components/Chat/Threads.svelte'
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

  // control modal (Hybrid.jsx:27-28)
  let isModalOpen = $state(false)
  const toggleModal = () => (isModalOpen = !isModalOpen)

  // control whether the Buffer is shown (Hybrid.jsx:31-32). userInputWidth is a
  // $derived class string (the React `let userInputWidth = isBufferShown ? ... : ...`).
  let isBufferShown = $state(false)
  let userInputWidth = $derived(isBufferShown ? 'w-3/4 ps-40' : 'w-full')

  // Run the tour when isTourStart flips true. handleReset (Hybrid.jsx:35-51) had
  // THREE branches; they map as:
  //   data.index===6 → setIsBufferShown(true)  → buildHybridSteps' onBeforeHighlight
  //                                               at index 6 (lib/tour.js)
  //   action 'reset' → setIsTourStart(false)    → onReset
  //   action 'stop'  → setIsBufferShown(false) + start timer → onStop
  let tourRunning = false
  $effect(() => {
    if (session.isTourStart && !tourRunning) {
      tourRunning = true
      startTour({
        steps: buildHybridSteps(() => {
          isBufferShown = true // Hybrid.jsx:41-43 (data.index===6 → open Buffer)
        }),
        onReset: () => {
          session.isTourStart = false
        },
        onStop: () => {
          isBufferShown = false // Hybrid.jsx:46 — 'stop' closes the Buffer
          if (!session.timerActive) {
            session.setTimerActive(true)
          }
          tourRunning = false
        },
      })
    }
  })

  // create a new thread (Hybrid.jsx:129-155). DEVIATION as in Chat.svelte: page-local
  // helper (not a store action — store is DONE), faithful to React's page-module fn.
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

<div class="h-screen min-w-screen overflow-hidden relative">
  <div class="z-50 absolute top-[18px] right-4">
    <Timer />
  </div>
  <div class="h-full w-full flex flex-row relative">
    <div class="absolute z-30 w-full h-16 bg-white bg-opacity-65 backdrop-blur-[6px]"></div>
    <div class="absolute z-30 h-full ps-8 pt-4 flex flex-col items-start">
      <span class="shadow-md rounded-full">
        <Logo />
      </span>
      <div class="w-40 mt-8 flex flex-col items-start space-y-3">
        <NavButton text="how to ask?" onclick={toggleModal} className="step-one" />
        <NavButton text="new chat" onclick={() => createNewThread()} className="step-two" />
        <HistoryButton text="history" className="step-three" />
      </div>
    </div>
    {#if session.isLoadingThread}
      <LoadingIndicator />
    {/if}
    <Threads isForHybrid={true} {isBufferShown} setIsBufferShown={(v) => (isBufferShown = v)} />
    <div class="{userInputWidth} absolute z-40 bottom-0 backdrop-blur-md pb-4 duration-500">
      <UserInput className="step-four" />
    </div>
  </div>
  <Modal isOpen={isModalOpen} onClose={() => (isModalOpen = false)} />
  <LoginModal isOpen={session.isLoginModalOpen} onClose={() => (session.isLoginModalOpen = false)} />
  <TimesUpModal />
  <InstructionModal />
  <!-- <ToastContainer/> dropped — single app-root <Toaster/> in App.svelte (L7.2). -->
</div>
