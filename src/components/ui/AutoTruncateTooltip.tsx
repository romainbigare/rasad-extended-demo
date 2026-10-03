import { useEffect, useLayoutEffect, useRef, useState } from "react";

const MAX_DEPTH = 6;
const GAP = 8;
const EDGE = 8;

/** True when `el` holds text directly (not only through child elements). */
function hasOwnText(el: HTMLElement): boolean {
  return Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim());
}

/**
 * True when `el` cuts its text: one line ending in "…" (truncate / text-ellipsis), a line-clamp,
 * or one line clipped without a "…" (nowrap + overflow hidden). The last case only counts for an
 * element that holds the text itself, so a card that merely clips its children never pops a tip.
 */
function isCut(el: HTMLElement): boolean {
  const s = getComputedStyle(el);
  if (s.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) return true;
  const clamp = s.getPropertyValue("-webkit-line-clamp");
  if (clamp && clamp !== "none" && el.scrollHeight > el.clientHeight + 1) return true;
  const clips = s.overflowX === "hidden" || s.overflowX === "clip";
  const oneLine = s.whiteSpace === "nowrap" || s.whiteSpace === "pre";
  return clips && oneLine && hasOwnText(el) && el.scrollWidth > el.clientWidth + 1;
}

function findCut(node: EventTarget | null): HTMLElement | null {
  let el = node instanceof HTMLElement ? node : null;
  for (let i = 0; el && i < MAX_DEPTH; i++, el = el.parentElement) {
    if (el.closest("[data-no-auto-tip], .ol-viewport")) return null; // opt-out, and the OpenLayers map
    if (isCut(el)) return el;
  }
  return null;
}

type Tip = { el: HTMLElement; text: string; rect: DOMRect };

/**
 * App-wide: any text cut off with "…" (or a line-clamp) shows its full text on hover or
 * keyboard focus, in the app's tooltip style (white card, light border, soft shadow).
 * Text that fits gets nothing. Mounted once in _app, so every page - and every page added
 * later - gets it without per-component wiring. A native `title` on the cut element is
 * parked while ours shows, so the black browser tooltip doesn't appear on top of it.
 * Opt out on a subtree with `data-no-auto-tip`.
 */
export function AutoTruncateTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const restoreTitle = (el: HTMLElement) => {
      const parked = el.getAttribute("data-auto-tip-title");
      if (parked !== null) {
        el.setAttribute("title", parked);
        el.removeAttribute("data-auto-tip-title");
      }
    };
    const hide = () => {
      if (current.current) restoreTitle(current.current);
      current.current = null;
      setTip(null);
      setPos(null);
    };
    const show = (target: EventTarget | null) => {
      const el = findCut(target);
      if (el === current.current) return;
      hide();
      if (!el) return;
      const text = (el.innerText || el.textContent || "").trim();
      if (!text) return;
      const title = el.getAttribute("title");
      if (title !== null) {
        el.setAttribute("data-auto-tip-title", title);
        el.removeAttribute("title");
      }
      current.current = el;
      setTip({ el, text, rect: el.getBoundingClientRect() });
    };
    const onOver = (e: MouseEvent) => show(e.target);
    // Also re-check on mouse move (once per frame): a scroll hides the tip, and smooth scrolling keeps
    // firing scroll events after the pointer lands on the text - with only "mouseover" the tip never
    // came back until the pointer left and re-entered the text (seen on the Farm page tiles).
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      if (frame) return;
      const target = e.target;
      frame = requestAnimationFrame(() => {
        frame = 0;
        show(target);
      });
    };
    const onFocus = (e: FocusEvent) => show(e.target);
    const onLeaveDoc = (e: MouseEvent) => {
      if (!e.relatedTarget) hide();
    };
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", hide, true);
    document.addEventListener("mouseout", onLeaveDoc, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      hide();
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", hide, true);
      document.removeEventListener("mouseout", onLeaveDoc, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  // Place it once its size is known: centred above the text, below if there's no room, kept on screen.
  useLayoutEffect(() => {
    const box = tipRef.current;
    if (!tip || !box) return;
    const { width, height } = box.getBoundingClientRect();
    const r = tip.rect;
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, EDGE), window.innerWidth - width - EDGE);
    const top = r.top - height - GAP >= EDGE ? r.top - height - GAP : r.bottom + GAP;
    setPos({ left, top });
  }, [tip]);

  if (!tip) return null;
  return (
    <div
      ref={tipRef}
      role="tooltip"
      className="pointer-events-none fixed z-[1000] max-w-[min(320px,calc(100vw-1rem))] whitespace-normal break-words rounded-lg border border-line bg-white px-2.5 py-1.5 text-start text-xs font-medium normal-case leading-snug tracking-normal text-ink shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
    >
      {tip.text}
    </div>
  );
}
