import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { cx } from "@/components/ui/cx";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { useDropdownPlacement } from "@/components/ui/useDropdownPlacement";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  disabled,
  title,
  className,
  buttonClassName,
  testId,
}: {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  /** Button text when no option matches `value` (e.g. "Loading…"). */
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  /** Wrapper classes (width, margins). */
  className?: string;
  /** Replaces the button's field classes (e.g. FIELD_ON_DARK_CLASS). */
  buttonClassName?: string;
  testId?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Opens under the button's start edge; flipped to its end edge when that would run off the screen.
  const [alignEnd, setAlignEnd] = useState(false);
  // Opens upward when there isn't room below (e.g. near the bottom of the screen).
  const placement = useDropdownPlacement(open, buttonRef, listRef);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];
  const isDisabled = disabled || options.length === 0;

  const openList = () => {
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };
  const pick = (option: SelectOption) => {
    if (option.value !== value) onChange(option.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setAlignEnd(false);
      return;
    }
    const rect = listRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rtl = getComputedStyle(listRef.current as Element).direction === "rtl";
    if (rtl ? rect.left < 8 : rect.right > document.documentElement.clientWidth - 8) setAlignEnd(true);
  }, [open]);

  // Keep the active row in view while moving with the keyboard.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  /** Type-ahead: letters typed within 600ms of each other build one search. */
  const jumpTo = (key: string) => {
    const now = Date.now();
    typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + key.toLowerCase(), at: now };
    const found = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
    if (found >= 0) setActive(found);
  };

  const onListKey = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (e.key === "Tab") {
      close(false);
      return;
    }
    if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, last));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Enter" || e.key === " ") {
      if (options[active]) pick(options[active]);
    } else if (e.key === "Escape") close();
    else if (e.key.length === 1) jumpTo(e.key);
    else return;
    e.preventDefault();
  };

  const onButtonKey = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  return (
    <div ref={rootRef} className={cx("relative", className)} data-testid={testId}>
      <button
        ref={buttonRef}
        type="button"
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        title={title}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKey}
        className={cx(
          "flex w-full items-center justify-between gap-2 text-start text-ink disabled:cursor-not-allowed",
          buttonClassName ?? FIELD_CLASS,
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span aria-hidden className="flex-none text-muted">
          ▾
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          style={placement.maxHeight ? { maxHeight: placement.maxHeight } : undefined}
          className={cx(
            "absolute z-30 m-0 max-h-72 w-max min-w-full max-w-[min(320px,calc(100vw-1rem))] list-none",
            placement.up ? "bottom-full mb-1.5" : "top-full mt-1.5",
            alignEnd ? "end-0" : "start-0",
            "overflow-y-auto rounded-xl border border-line bg-panel p-0 py-1 text-xs text-ink shadow-lg outline-none",
          )}
        >
          {options.map((option, i) => (
            <li
              key={option.value}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setActive(i)}
              // mousedown, not click: keeps focus off the button so the list doesn't close first.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(option);
              }}
              className={cx(
                "cursor-pointer truncate px-3 py-2 touch:py-3",
                i === active && "bg-[#f4f7f6]",
                option.value === value && "font-bold",
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
