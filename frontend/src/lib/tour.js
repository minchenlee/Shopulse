// lib/tour.js
// L6.4 — the guided-tour engine. Ports the three React-Joyride blocks
// (Chat.jsx, Hybrid.jsx, Gui.jsx) to driver.js (decision D9). HIGHEST RISK in the
// port: there is NO drop-in. Joyride is declarative (<Joyride steps run callback>),
// driver.js is imperative (driver({steps}).drive()). This module is the ONE shared
// tour wrapper; each page passes its own step array + side-effect callbacks.
//
// ── Joyride → driver.js config mapping (D9) ───────────────────────────────────
//   steps[].target           → steps[].element
//   steps[].content          → steps[].popover.description
//   continuous:true          → driver.js default (Next/Done buttons, one popover)
//   hideCloseButton:true  ┐
//   disableCloseOnEsc:true├→ allowClose:false  (no ✕, Esc/overlay can't close)
//   disableOverlayClose ┘
//   spotlightPadding:4       → stagePadding:4
//   placement:'right'        → steps[].popover.side:'right'  (Gui step-two)
//   disableScrolling:true    → steps[].disableScroll flag, honored in onHighlightStarted
//                              (driver.js has no built-in per-step scroll switch; the
//                               Gui filter sidebar is `fixed` + already in view, so we
//                               simply do not re-scroll — see refreshOnScroll below)
//   disableBeacon:true       → no-op (driver.js has no beacon; faithful — the first
//                              step just shows immediately, same as Joyride continuous)
//
// ── The `styles` object has NO driver.js JS equivalent ────────────────────────
// Joyride took primaryColor/textColor/spotlightShadow/borderRadius/fontFamily as a
// JS object. driver.js styles via CSS only. We attach a `popoverClass` and ship the
// matching theme CSS in lib/tour.css (imported by the pages that run a tour). Getting
// this wrong = a visible UX change (forbidden), so the CSS reproduces every value:
// primaryColor #343434, textColor #343434, borderRadius 15px, Nunito, the
// 0 0 15px rgba(0,0,0,0.5) spotlight shadow, and the Next-button padding/radius.
//
// ── Callback semantics (Joyride `callback(data)` → driver.js hooks) ───────────
//   data.action==='reset'  (tour fully finished/closed) → onDestroyed  → onReset()
//   data.action==='stop'   (tour stopped)               → onDestroyed  → onStop()
//   data.index===6 (Hybrid: open the Buffer mid-tour so steps 8-10 selectors exist)
//                          → per-step onHighlightStarted at index 6 → step.onBeforeHighlight()
//
// In Joyride a single `callback` saw BOTH 'reset' and 'stop'. driver.js fires
// onDestroyed once when the tour ends regardless of how — so we route the page's
// reset+stop work through a single onDestroyed. Chat/Gui's handleReset did
// setIsTourStart(false) on 'reset' AND startTimer on 'stop'; both must happen once
// when the tour ends → we call BOTH onReset() and onStop() from onDestroyed. This is
// faithful: in the real app a completed tour both clears isTourStart and starts the
// timer (Joyride emitted 'stop' then 'reset' at the end of a continuous run).

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tour.css'; // the theme CSS reproducing Joyride's `styles` object (D9)

// Convert a Joyride-style step ({ target, content, placement, disableScrolling,
// onBeforeHighlight }) into a driver.js step. Kept tiny + faithful: only the keys the
// three React pages actually used are mapped.
function toDriverStep(step) {
  const popover = { description: step.content, popoverClass: 'shopulse-tour' };
  if (step.placement) {
    popover.side = step.placement; // 'right' (Gui step-two)
  }

  const driverStep = {
    element: step.target,
    popover,
  };

  // Hybrid index-6 Buffer-open + the duration-1000 animation (D9): when this step
  // begins highlighting, run its side-effect (open the Buffer) so the later
  // step-nine/step-ten selectors exist by the time driver.js reaches them.
  if (step.onBeforeHighlight) {
    driverStep.onHighlightStarted = () => step.onBeforeHighlight();
  }

  return driverStep;
}

// Build + drive a tour. `steps` is the page's Joyride-shaped array; `onReset`/`onStop`
// mirror the page's handleReset branches. Returns the driver instance so a page could
// stop it if needed (none currently do — faithful to Joyride's run-prop model).
export function startTour({ steps, onReset = () => {}, onStop = () => {} }) {
  // Guard the timer-once semantics (reset-vs-stop, D9): onDestroyed can be invoked
  // once; we additionally latch so a page's onStop (which starts the timer) can never
  // double-fire even if a future driver.js version calls a hook twice.
  let ended = false;

  const driverObj = driver({
    showProgress: false,
    allowClose: false, // hideCloseButton + disableCloseOnEsc + disableOverlayClose
    overlayColor: 'rgba(0, 0, 0, 0.5)', // matches the spotlightShadow darkness feel
    stagePadding: 4, // spotlightPadding:4
    stageRadius: 5,
    showButtons: ['next', 'previous'], // continuous Next/Back; NO close button
    steps: steps.map(toDriverStep),
    // Joyride callback 'reset' + 'stop' both happen when a continuous tour ends.
    // driver.js fires onDestroyed once at the end (finish OR programmatic destroy).
    onDestroyed: () => {
      if (ended) return;
      ended = true;
      onReset(); // setIsTourStart(false)
      onStop(); // start the timer once (+ Hybrid: close the Buffer)
    },
  });

  driverObj.drive();
  return driverObj;
}

// ── Per-page step arrays ──────────────────────────────────────────────────────
// Lifted verbatim (target + content) from the three React `steps` consts. Kept here
// so the cross-slice selector inventory (L7.1) has one home. The non-contiguous Gui
// set (1,2,5,6,7) is intentional — those are the only anchors that exist on /gui.

// Chat.jsx steps (1-7).
export const chatSteps = [
  { target: '.step-one', content: 'Simple tips for clearly stating your question or request.', disableBeacon: true },
  { target: '.step-two', content: 'Start a new conversation with our AI assistant.' },
  { target: '.step-three', content: 'View your previous chat logs and conversations.' },
  { target: '.step-four', content: 'Enter your message here to send to Max, our AI assistant.' },
  { target: '.step-five', content: 'View the task instructions and scenario here.' },
  { target: '.step-six', content: 'Launch the interactive website tour for a quick walkthrough.' },
  { target: '.step-seven', content: 'Track your task time here, don\'t worry, it will start after you finish this tour.' },
];

// Hybrid.jsx steps (1-10). buildHybridSteps wires the index-6 Buffer-open side-effect
// (Joyride `data.index===6 → setIsBufferShown(true)`) onto the step at index 6 via
// onBeforeHighlight, so the page's `setIsBufferShown` setter is injected here.
export function buildHybridSteps(openBuffer) {
  return [
    { target: '.step-one', content: 'Simple tips for clearly stating your question or request.', disableBeacon: true },
    { target: '.step-two', content: 'Start a new conversation with our AI assistant.' },
    { target: '.step-three', content: 'View your previous chat logs and conversations.' },
    { target: '.step-four', content: 'Enter your message here to send to Max, our AI assistant.' },
    { target: '.step-five', content: 'View the task instructions and scenario here.' },
    { target: '.step-six', content: 'Launch the interactive website tour for a quick walkthrough.' },
    // index 6: Joyride opened the Buffer here so steps 8-10 (.step-eight/-nine/-ten)
    // have valid selectors. The Buffer open animates over duration-1000; opening it as
    // THIS step starts highlighting gives the animation a head start before driver.js
    // advances to the step-eight spotlight.
    { target: '.step-seven', content: 'Track your task time here, don\'t worry, it will start after you finish this tour.', onBeforeHighlight: openBuffer },
    { target: '.step-eight', content: 'Click here to open or close the Buffer, which is a space for you to store products you are interested in and access their details or reviews later.' },
    { target: '.step-nine', content: 'You can view the filtering condition that Max is using to recommend products to you here.' },
    { target: '.step-ten', content: 'You can view the products that Max has recommended to you here, and click on the button below to view more details or reviews.' },
  ];
}

// Gui.jsx steps (1, 2, 5, 6, 7 — non-contiguous; those are the only /gui anchors).
// step-two carried placement:'right' + disableScrolling:true.
export const guiSteps = [
  { target: '.step-one', content: 'This is a search bar, you can type keyword here to search for products.', disableBeacon: true },
  { target: '.step-two', content: 'Here you can select filters to narrow down your search results.', placement: 'right', disableScrolling: true },
  { target: '.step-five', content: 'View the task instructions and scenario here.' },
  { target: '.step-six', content: 'Launch the interactive website tour for a quick walkthrough.' },
  { target: '.step-seven', content: 'Track your task time here, don\'t worry, it will start after you finish this tour.' },
];
