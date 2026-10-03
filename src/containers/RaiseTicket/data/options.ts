export const TICKET_CATEGORIES = [
  "telemetry",
  "cadastral",
  "treeHealth",
  "irrigation",
  "imagery",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = [
  { key: "critical", hours: 2 },
  { key: "high", hours: 6 },
  { key: "normal", hours: 24 },
] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]["key"];

export const ATTACHMENT_EXTENSIONS = [".tif", ".tiff", ".csv", ".jpg", ".jpeg", ".pdf"] as const;
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
