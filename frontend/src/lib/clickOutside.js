// lib/clickOutside.js
//
// L3.1 — Svelte action port of hooks/useClickOutside.jsx.
//
// React used a hook that returned a ref (`domNodeRef`) attached to the modal box;
// a document-level mousedown/touchstart listener fired the handler whenever the
// click target was NOT inside that node. Svelte's idiom for "DOM-node-bound
// behaviour" is an action: `use:clickOutside={handler}` on the box element gives
// us the node directly (`node` arg), so no ref holder is needed.
//
// Faithful to useClickOutside.jsx:6-23: bind `mousedown` + `touchstart` on
// `document`; on each, if the node does NOT contain the event target, call the
// handler; unbind on destroy. The handler is read live via `getHandler` so a
// parent passing a fresh closure each render still calls the latest one (mirrors
// the React effect re-binding on `[handler]`).
export function clickOutside(node, handler) {
  let currentHandler = handler;

  const maybeHandler = (event) => {
    // useClickOutside.jsx:9 — `!domNodeRef.current?.contains(event.target)`
    if (!node.contains(event.target)) {
      currentHandler?.();
    }
  };

  document.addEventListener('mousedown', maybeHandler);
  document.addEventListener('touchstart', maybeHandler);

  return {
    update(newHandler) {
      currentHandler = newHandler;
    },
    destroy() {
      document.removeEventListener('mousedown', maybeHandler);
      document.removeEventListener('touchstart', maybeHandler);
    },
  };
}
