// === Ticket Types ===
export interface TicketPolicy {
  code_coverage: number | null;
  doc_link: string | null;
  qa_approved: boolean | null;
  docker_build_test: boolean | null;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  type: "Incident" | "Bug" | "Feature" | "Patch" | "Update";
  class_of_service: "Expedite" | "Fixed Date" | "Standard" | "Intangible";
  lane: string;
  assignee: string;
  created_at: number;
  updated_at: number;
  lead_time: number | null;
  wip_limit_exceeded: boolean;
  policies: TicketPolicy;
  ai_summary: string | null;
  chat_logs: string[] | null;
  error_logs: string | null;
}

export interface TicketCreate {
  title: string;
  description: string;
  type: string;
  class_of_service: string;
  assignee: string;
  lane?: string;
}

// === Metrics ===
export interface Metrics {
  deployment_frequency: number;
  lead_time_for_changes: number;
  change_failure_rate: number;
  mean_time_to_restore: number;
  first_response_time: number;
  first_call_resolution: number;
  self_service_adoption: number;
  customer_satisfaction: number;
}

// === AI Types ===
export interface TriageResult {
  type: string;
  class_of_service: string;
  squad: string;
  impact: string;
  confidence: number;
  reasoning: string;
}

export interface KBSearchResult {
  results: {
    id: string;
    title: string;
    sections: {
      subtitle: string;
      content: string;
      score: number;
    }[];
  }[];
  gap_detected: boolean;
  draft_created: boolean;
}

export interface KBDraft {
  id: string;
  title: string;
  query: string;
  content: string;
  created_at: number;
}

// === Lane Config ===
export const LANES = [
  { id: "to_do", label: "A Fazer", limit: null },
  { id: "refinement", label: "Refinamento", limit: 4 },
  { id: "development", label: "Desenvolvimento", limit: 3 },
  { id: "qa_testing", label: "Revisão / QA", limit: 2 },
  { id: "ready_for_deploy", label: "Implantação", limit: null },
] as const;

export type LaneId = (typeof LANES)[number]["id"];

// === Gemini ===
export const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
] as const;
