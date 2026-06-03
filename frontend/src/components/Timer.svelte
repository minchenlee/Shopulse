<script>
  // L2.2 — port of components/Timer.jsx. Carries the step-five / step-six /
  // step-seven tour anchors (L7.1). Reads timeLeft/timerActive from the store and
  // drives the info modal, tour start, and timer start.
  //
  // The reason not to elevate the state to the UserSessionContext
  // is because the Timer need to be updated every second
  // if the state is elevated, the whole Page will be re-rendered every second
  // which results in the lagging of the page
  //   (carried verbatim from Timer.jsx:7-10. In the Svelte port the per-second tick
  //    lives in the store's interval; this component just reads timeLeft.)
  import { session } from '../lib/session.svelte.js'
  // faithful port: pre-existing quirk — React also imported ToastContainer/toast
  // and FeatherIcon here but never rendered them; dropped (React-specific, no-ops).

  // startTimer (Timer.jsx:12-19): no-op if already active, else start + clear the
  // times-up localStorage flag.
  function startTimer() {
    if (session.timerActive) {
      return
    }
    session.setTimerActive(true) // Function to start the timer
    localStorage.removeItem('SHOPULSE_IS_TIMES_UP')
  }

  const minutes = $derived(Math.floor(session.timeLeft / 60))
  const seconds = $derived(session.timeLeft % 60)

  function handleStartTour() {
    // console.log('Tour start');
    session.isTourStart = true
  }

  function handleInstructionModal() {
    session.isInstructionModalOpen = true
  }
</script>

<div class="flex flex-row items-center space-x-3">
  <button
    class="step-five w-8 h-8 flex items-center justify-center bg-white rounded-full border-primary border-[1px] opacity-30 hover:opacity-100 duration-500 font-russoOne relative group"
    onclick={handleInstructionModal}
  >
    <!-- <FeatherIcon icon='info' size='20px' strokeWidth={3}/> -->
    <span>i</span>
  </button>
  <button
    onclick={handleStartTour}
    class="step-six w-8 h-8 flex items-center justify-center bg-white rounded-full border-primary border-[1px] opacity-30 hover:opacity-100 duration-500 font-russoOne relative group"
  >
    <span>?</span>
    <!-- <span className='absolute duration-500 opacity-0 bottom-0 right-1/2 translate-x-1/2 bg-primary text-white w-4 h-4 rounded-full flex items-center justify-center group-hover:opacity-100'>i</span> -->
  </button>
  <button
    onclick={startTimer}
    class="step-seven w-48 h-auto flex items-center justify-center p-2 bg-white rounded-xl border-primary border-[1px] opacity-30 hover:opacity-100 transition-opacity duration-500 cursor-default"
  >
    <div class="flex flex-row items-center font-russoOne">
      <div class="me-2">Time left:</div>
      <!-- <div className={`${timerActive ? 'animate-breathe-scale' : ''}`}> -->
      <div>
        {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
      </div>
    </div>
  </button>
</div>
