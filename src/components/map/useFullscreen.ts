import { type RefObject, useCallback, useEffect, useState } from "react";

export function useFullscreen(ref: RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void ref.current?.requestFullscreen?.();
    }
  }, [ref]);

  const supported = typeof document !== "undefined" && Boolean(document.fullscreenEnabled);
  return { isFullscreen, toggle, supported };
}
