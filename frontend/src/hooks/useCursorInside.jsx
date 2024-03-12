import { useState, useCallback } from 'react';

// Custom hook to detect if cursor is inside a component
export function useCursorInside() {
  const [isCursorInside, setIsCursorInside] = useState(false);

  // Handler for mouse entering the component area
  const handleMouseEnter = useCallback(() => {
    setIsCursorInside(true);
  }, []);

  // Handler for mouse leaving the component area
  const handleMouseLeave = useCallback(() => {
    setIsCursorInside(false);
  }, []);

  return { isCursorInside, handleMouseEnter, handleMouseLeave };
}
