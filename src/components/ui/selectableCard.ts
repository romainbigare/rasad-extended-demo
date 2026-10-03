import { UI } from "@/styles/global";

/**
 * The one "selected" look for every clickable card in the app (Farm Ranking metric cards,
 * map layer rows, thematic rows, satellite pass cards, feedback options): green border,
 * light green background, and an inset ring so the border reads 2px without shifting
 * the layout. Use with a card that already has `border` (and its own rounding/padding).
 */
// Defined in src/styles/global.ts.
export const CARD_SELECTED = UI.cardSelected;
export const CARD_UNSELECTED = UI.cardUnselected;

export const selectableCard = (selected: boolean) => (selected ? CARD_SELECTED : CARD_UNSELECTED);
