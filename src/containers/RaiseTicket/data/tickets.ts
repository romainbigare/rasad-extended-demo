import type { TicketCategory, TicketPriority } from "./options";

export type TicketStatus = "open" | "inProgress" | "resolved";

export type SubmittedTicket = {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  farm: string;
  fieldId: string;
  contactPhone: string;
  attachments: string[];
  createdAt: string;
};
