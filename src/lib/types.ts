export type Role = "employee" | "technician" | "admin";
export type Status = "open" | "in_progress" | "resolved";
export type Urgency = "low" | "medium" | "high";

export interface Profile {
  id: string;
  full_name: string;
  department: string | null;
  role: Role;
}

export interface Ticket {
  id: number;
  created_at: string;
  summary: string | null;
  message: string | null;
  category: string;
  urgency: Urgency;
  priority_score: number;
  status: Status;
  assigned_to: string | null;
  requester_id: string | null;
  name: string | null;
  department: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
}

export interface Note {
  id: number;
  author_id: string;
  body: string;
  internal: boolean;
  created_at: string;
}

export interface AuditEntry {
  action: string;
  detail: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  keywords: string[];
  steps: string[];
  updated_at?: string;
  updated_by?: string | null;
}

export interface DeskStats {
  open_tickets: number;
  in_progress: number;
  resolved: number;
  overdue: number;
  avg_hours_to_first_reply: number | null;
  avg_hours_to_resolve: number | null;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}
