// lib/session.svelte.js
//
// L1.3 — the module-singleton rune store. A 1:1 port of
// context/UserSessionContext.jsx (317 LOC): every `useState` → `$state`, the
// timer, `login`/`logout`/`updateThreadsList`, the three `useRef`s → exported
// `$state` ref holders bound via `bind:this`, and a NEW `sendMessage()` action
// (decision D6) that replaces Buffer's `sendMessageButtonRef.current.click()`
// anti-pattern.
//
// WHY a `.svelte.js` module singleton (not a Svelte context): React used a single
// <UserSessionProvider> at the app root, so all consumers shared one instance. A
// module-level rune store is the faithful equivalent — import the same `session`
// everywhere, no provider wrapper. (App.jsx's <UserSessionProvider> wrapper is
// therefore dropped; App.svelte just renders the router.)
//
// WHAT LIVES ELSEWHERE (App.svelte, L1.4): module-level `$effect`s need an effect
// root, which a plain `.svelte.js` module does not have. So the React `useEffect`s
// that REACT to state changes move to App.svelte:
//   - the SSE/history effect keyed on currentThreadID (UserSessionContext.jsx:182)
//   - the updateThreadsList-on-currentMessages effect (:234)
//   - the timeLeft===0 → isTimesUp effect (:84)
//   - the productDataList/isLoadingData → hasResult effect (:243)
//   - the storedTime / SHOPULSE-bootstrap / login-on-location effects (:43,:51,:167)
// They call into the actions/state exported here. The timer INTERVAL itself lives
// here (plan §L1.3: "the timer setInterval stays here") but is started/stopped by
// the `setTimerActive` action rather than a module `$effect`.

import { fetchData, postData } from './api.js';
import { streamChat } from './streamChat.js';

const baseURL = import.meta.env.VITE_API_BASE_URL;

// toast is injected by App.svelte (svelte-sonner) so this module stays free of any
// component/DOM import and the store can be unit-imported in Node. Mirrors the
// React `toast.error(...)` calls in login() and sendMessage().
let toastError = (msg) => console.error(msg);
export function registerToast(fn) {
  toastError = fn;
}

function createSession() {
  // ---- CUI state (UserSessionContext.jsx:12-19) ----
  let userID = $state(null);
  let currentThreadID = $state('');
  let threadsList = $state({});
  let isLoadingThread = $state(false);
  let currentEvent = $state(null);
  let currentMessages = $state({});
  let messageStatus = $state('completed');
  let userInput = $state('');

  // ---- GUI state (:22-25) ----
  let productDataList = $state(undefined);
  let isLoadingData = $state(false);
  let hasResult = $state(false);
  let searchQuery = $state('');

  // ---- General state (:28-33) ----
  let isLoginModalOpen = $state(true); // control login modal
  let isInstructionModalOpen = $state(false);
  let isTimesUp = $state(false);
  let isTourStart = $state(false);
  let timerActive = $state(false);
  let timeLeft = $state(720);
  // let timeLeft = $state(30); // For testing purpose (carried, commented — :34)

  // ---- ref holders (:38-40). React useRef → $state holders bound via bind:this. ----
  let textAreaRef = $state(null);
  let sendMessageButtonRef = $state(null);
  let lastMessageRef = $state(null);

  // ---- the timer interval (:58-80) ----
  // React drove this via useEffect([timerActive]); here `setTimerActive` starts/stops
  // the interval directly so no module-level $effect (which needs a root) is needed.
  let timerInterval = null;

  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      // mirror the functional updater (prevTimeLeft) => newTimeLeft
      const newTimeLeft = timeLeft - 1;
      // console.log('time left:', newTimeLeft);
      if (newTimeLeft <= 0) {
        localStorage.removeItem('SHOPULSE_TIMER');
        localStorage.setItem('SHOPULSE_IS_TIMES_UP', 'true');
        stopTimer(); // clearInterval — stop when time is up
        timerActive = false; // setTimerActive(false)
        timeLeft = 0;
        return;
      }
      localStorage.setItem('SHOPULSE_TIMER', newTimeLeft.toString());
      timeLeft = newTimeLeft;
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function setTimerActive(value) {
    timerActive = value;
    if (value) startTimer();
    else stopTimer();
  }

  // ---- bootstrap helpers (the SHOPULSE_TIMER + SHOPULSE reads, :43-56) ----
  // Called once by App.svelte's mount effect. Carries the localStorage keys verbatim.
  function bootstrapFromStorage() {
    const storedTime = localStorage.getItem('SHOPULSE_TIMER');
    if (storedTime) {
      setTimerActive(true);
      timeLeft = parseInt(storedTime);
    }

    const stored = JSON.parse(window.localStorage.getItem('SHOPULSE')) || {};
    if (Object.keys(stored).includes('userID')) {
      userID = stored.userID;
    }
  }

  // ---- login (:92-156) ----
  async function login(loginUserID) {
    userID = loginUserID;

    // save the user ID to the local storage
    const stored = JSON.parse(window.localStorage.getItem('SHOPULSE')) || {};

    if (!Object.keys(stored).includes('userID')) {
      stored.userID = loginUserID;
      window.localStorage.setItem('SHOPULSE', JSON.stringify(stored));

      // start the tour
      isTourStart = true;
    }

    // Check the current path, if is chat, get the thread; if is gui, return.
    const path = location.pathname;
    if (path.includes('gui')) {
      console.log('GUI page, skipping thread');
      return;
    }

    try {
      isLoadingThread = true;

      let response;
      let threads;
      try {
        // check if the user has a thread
        response = await fetchData('/chat/threads?userId=' + loginUserID);
        threads = response.threads;
        if (threads.length !== 0) {
          // sort the threads by updateAt
          threads.sort((a, b) => {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          }, []);
          threadsList = threads;
          currentThreadID = threads[0].threadId;
          // console.log(threads);
          return;
        }
      } catch (error) {
        // if the user is not found, just skip the error
        // the user will be created in the next step
        console.log('New user, creating a new thread');
      }

      // if the user doesn't have a thread, create a new thread
      let responseData = await postData('/chat/threads', { userId: loginUserID });
      const threadID = responseData.threadId;
      currentThreadID = threadID;
    } catch (error) {
      console.log(error);
      toastError(error, {
        className: 'bg-white bg-opacity-70 font-russoOne text-primary rounded-xl border-grey border-[1px]',
        position: 'top-center',
        autoClose: false,
        hideProgressBar: true,
        closeButton: true,
      });
    }
  }

  // ---- logout (:159-165) ----
  function logout() {
    userID = '';
    threadsList = {};
    currentMessages = {};
    currentThreadID = null;
    // Clean up user data and tokens
  }

  // ---- updateThreadsList (:223-232). React called this from a useEffect([currentMessages]);
  // App.svelte owns that effect now and calls this. ----
  async function updateThreadsList() {
    const response = await fetchData('/chat/threads?userId=' + userID);

    const threads = response.threads;
    // sort the threads by updateAt
    threads.sort((a, b) => {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    }, []);
    threadsList = threads;
  }

  // ---- setCurrentMessages — the canonical store mutation (R2) ----
  // The streamChat reader hands the FULL `messages` frame payload
  // `{ type:'messages', data:{ data:[…newest-first…] } }`. Storing it whole keeps
  // `currentMessages.data.data` resolving to the newest-first array — exactly what
  // parseMessages.js and Threads.jsx (currentMessages.data.data) consume. Mirrors
  // the old `setCurrentMessages(data)`.
  function setCurrentMessages(value) {
    currentMessages = value;
  }

  // ---- sendMessage() action (decision D6) ----
  // The single send path. Used by Chat/UserInput (replaces handleSubmit's inline
  // postData) AND by Buffer/ProductCard (replaces sendMessageButtonRef.click()).
  //
  // Faithful to UserInput.handleSubmit (UserInput.jsx:50-95): optimistic-insert a
  // user message into currentMessages.data.data, clear the input, POST. The NEW
  // transport difference (R1): the old code relied on the already-open EventSource
  // to stream the reply; here the POST `/chat/messages` IS the stream, so we drive
  // streamChat with callbacks that reproduce the EventSource onmessage transitions
  // in the same order (onEvent → setCurrentEvent; messages → setCurrentMessages;
  // runStatus → setMessageStatus).
  //
  // Note the phantom `.data.body.data` insert (UserInput.jsx:72) is DROPPED here
  // (R2) — only `.data.data` is the canonical shape.
  async function sendMessage(text) {
    const value = text ?? userInput;
    if (value === '') return; // UserInput.jsx:51 — no-op on empty

    // Build the optimistic user message (UserInput.jsx:56-68).
    const message = {
      role: 'user',
      run_id: 'run_temp',
      imageList: [],
      metadata: {},
      content: [{ text: { value } }],
    };

    // Optimistic insert into the canonical newest-first array. Guard the shape: if
    // there is no prior frame yet, seed one so `.data.data` exists.
    const newMessages = { ...currentMessages };
    if (!newMessages.data || !Array.isArray(newMessages.data.data)) {
      newMessages.type = 'messages';
      newMessages.data = { data: [] };
    } else {
      newMessages.data = { ...newMessages.data, data: [...newMessages.data.data] };
    }
    newMessages.data.data.unshift(message); // newest-first
    currentMessages = newMessages;

    // clear the text area (UserInput.jsx:77)
    userInput = '';

    // Drive the live stream. Callbacks mirror the old EventSource onmessage order.
    try {
      await streamChat({
        baseURL,
        threadId: currentThreadID,
        message: value,
        onEvent: (payload) => {
          currentEvent = payload; // setCurrentEvent(data) — ALWAYS first
        },
        onMessages: (payload) => {
          setCurrentMessages(payload); // setCurrentMessages(data)
        },
        onRunStatus: (status) => {
          messageStatus = status; // setMessageStatus(data.data.status)
        },
        onError: () => {
          // UserInput.jsx:84-93 — toast on send failure.
          toastError('Failed to send the message', {
            className: 'bg-white backdrop-blur-lg bg-opacity-70 font-russoOne text-primary rounded-xl border-grey border-[1px]',
            position: 'top-center',
            autoClose: false,
            hideProgressBar: true,
            closeButton: true,
          });
        },
      });
    } catch (error) {
      toastError('Failed to send the message', {
        className: 'bg-white backdrop-blur-lg bg-opacity-70 font-russoOne text-primary rounded-xl border-grey border-[1px]',
        position: 'top-center',
        autoClose: false,
        hideProgressBar: true,
        closeButton: true,
      });
    }
  }

  // The reactive surface. Getters expose the live rune values; setters mirror the
  // React `setX` so consuming components/effects (and App.svelte) write through the
  // store, keeping a single source of truth.
  return {
    // ---- General states ----
    get userID() { return userID; },
    get isLoginModalOpen() { return isLoginModalOpen; },
    set isLoginModalOpen(v) { isLoginModalOpen = v; },
    get isInstructionModalOpen() { return isInstructionModalOpen; },
    set isInstructionModalOpen(v) { isInstructionModalOpen = v; },
    get isTimesUp() { return isTimesUp; },
    set isTimesUp(v) { isTimesUp = v; },
    get isTourStart() { return isTourStart; },
    set isTourStart(v) { isTourStart = v; },
    get timerActive() { return timerActive; },
    setTimerActive,
    get timeLeft() { return timeLeft; },
    set timeLeft(v) { timeLeft = v; },
    login,
    logout,

    // ---- CUI states ----
    get currentThreadID() { return currentThreadID; },
    set currentThreadID(v) { currentThreadID = v; },
    get threadsList() { return threadsList; },
    set threadsList(v) { threadsList = v; },
    get isLoadingThread() { return isLoadingThread; },
    set isLoadingThread(v) { isLoadingThread = v; },
    get currentEvent() { return currentEvent; },
    get currentMessages() { return currentMessages; },
    setCurrentMessages,
    get messageStatus() { return messageStatus; },
    set messageStatus(v) { messageStatus = v; },
    get userInput() { return userInput; },
    set userInput(v) { userInput = v; },
    updateThreadsList,
    sendMessage,

    // ---- GUI states ----
    get productDataList() { return productDataList; },
    set productDataList(v) { productDataList = v; },
    get isLoadingData() { return isLoadingData; },
    set isLoadingData(v) { isLoadingData = v; },
    get hasResult() { return hasResult; },
    set hasResult(v) { hasResult = v; },
    get searchQuery() { return searchQuery; },
    set searchQuery(v) { searchQuery = v; },

    // ---- ref holders (bind:this targets) ----
    get textAreaRef() { return textAreaRef; },
    set textAreaRef(v) { textAreaRef = v; },
    get sendMessageButtonRef() { return sendMessageButtonRef; },
    set sendMessageButtonRef(v) { sendMessageButtonRef = v; },
    get lastMessageRef() { return lastMessageRef; },
    set lastMessageRef(v) { lastMessageRef = v; },

    // ---- bootstrap (App.svelte mount effect) ----
    bootstrapFromStorage,
  };
}

// The single shared instance (the React <UserSessionProvider> equivalent).
export const session = createSession();
