import { useEffect, useRef } from 'react';

function useClickOutside(handler) {
  const domNodeRef = useRef();

  useEffect(() => {
    // Function to check if clicked on outside of element
    const maybeHandler = (event) => {
      if (!domNodeRef.current?.contains(event.target)) {
        handler();
      }
    };

    // Bind the event listener
    document.addEventListener("mousedown", maybeHandler);
    document.addEventListener("touchstart", maybeHandler);

    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", maybeHandler);
      document.removeEventListener("touchstart", maybeHandler);
    };
  }, [handler]);

  return domNodeRef;
}

export default useClickOutside;
