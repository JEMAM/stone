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
  // Gemini 3.5 Pro — Frontier reasoning, complex agentic workflows
  { id: "gemini-3.5-pro-high", label: "Gemini 3.5 Pro (High Thinking)", group: "3.5 Pro" },
  { id: "gemini-3.5-pro-medium", label: "Gemini 3.5 Pro (Medium Thinking)", group: "3.5 Pro" },
  { id: "gemini-3.5-pro-low", label: "Gemini 3.5 Pro (Low Thinking)", group: "3.5 Pro" },
  { id: "gemini-3.5-pro-none", label: "Gemini 3.5 Pro (No Thinking)", group: "3.5 Pro" },
  // Gemini 3.5 Flash — Fast and efficient for routine tasks
  { id: "gemini-3.5-flash-medium", label: "Gemini 3.5 Flash (Medium Thinking)", group: "3.5 Flash" },
  { id: "gemini-3.5-flash-high", label: "Gemini 3.5 Flash (High Thinking)", group: "3.5 Flash" },
  { id: "gemini-3.5-flash-low", label: "Gemini 3.5 Flash (Low Thinking)", group: "3.5 Flash" },
  { id: "gemini-3.5-flash-none", label: "Gemini 3.5 Flash (No Thinking)", group: "3.5 Flash" },
  // Gemini 3.1 Pro — High-accuracy reasoning
  { id: "gemini-3.1-pro-high", label: "Gemini 3.1 Pro (High Thinking)", group: "3.1 Pro" },
  { id: "gemini-3.1-pro-medium", label: "Gemini 3.1 Pro (Medium Thinking)", group: "3.1 Pro" },
  { id: "gemini-3.1-pro-low", label: "Gemini 3.1 Pro (Low Thinking)", group: "3.1 Pro" },
  { id: "gemini-3.1-pro-none", label: "Gemini 3.1 Pro (No Thinking)", group: "3.1 Pro" },
  // Gemini 3.1 Flash Lite — Budget-friendly high-volume tasks
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", group: "3.1 Flash Lite" },
] as const;
