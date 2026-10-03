import { type ReactNode, createContext, useState } from "react";

/**
 * Where an opened breakdown table goes: a full-width area a page puts under a row of compact cards (a
 * table does not fit in a third of the page). With no slot (a card used on its own) the table opens
 * inside its card.
 */
export const BreakdownSlotContext = createContext<HTMLElement | null>(null);

/** A row of compact cards with the breakdown area right under it. */
export function BreakdownRow({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <BreakdownSlotContext.Provider value={slot}>
      <div className={className ?? "grid items-start gap-4 lg:grid-cols-3"} data-testid={testId}>
        {children}
      </div>
      <div ref={setSlot} className="flex flex-col gap-4 empty:hidden" />
    </BreakdownSlotContext.Provider>
  );
}
