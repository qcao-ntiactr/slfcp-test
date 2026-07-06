// ─────────────────────────────────────
// Entity + User
// ─────────────────────────────────────
export type EntityType = 'NTIA' | 'FEDERAL_AGENCY' | 'COMMERCIAL';

export interface Entity {
  id: number;
  name: string;
  abbreviation: string;
  type: EntityType;
  active: boolean;
  canConcur: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  external_id: string;
  entity_id: number;
}

// ─────────────────────────────────────
// Inquiry + Message
// ─────────────────────────────────────

export interface Message {
  id: number;
  inquiry_id: number;
  sender: string;
  content: string;
  timestamp: string;
  authoredByUser: boolean;
}

export interface PostMessagePayload {
  inquiry_id: number;
  content: string;
}

export interface Inquiry {
  id: number;
  request_id: number;
  entityA_id: number;
  entityB_id: number;
  messages: Message[];
  createdAt: string; //iso date string
  closed?: boolean;
  closedBy_id?: number;
  closedAt: string; //iso date string
}

// ─────────────────────────────────────
// API Responses
// ─────────────────────────────────────

export type InquiryWrapper = {
  recipientEntityId: number;
  recipientEntityName: string;
  recipientEntityAbbr: string;
  inquiry: Inquiry;
};

export type GetInquiriesResponse = {
  //eslint-disable-next-line no-unused-vars
  [type in EntityType]?: InquiryWrapper[];
};

export type SelectedEntityPerTab = Partial<{
  //eslint-disable-next-line no-unused-vars
  [type in EntityType]: number | undefined;
}>;
