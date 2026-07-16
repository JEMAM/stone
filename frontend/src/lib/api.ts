import type { Metrics, Ticket, TicketCreate, TriageResult, KBSearchResult, KBDraft } from "./types";

const BASE = "";

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// Metrics
export const getMetrics = () => fetcher<Metrics>("/api/metrics");

// Tickets
export const getTickets = () => fetcher<Ticket[]>("/api/tickets");

export const createTicket = (data: TicketCreate) =>
  fetcher<Ticket>("/api/tickets", { method: "POST", body: JSON.stringify(data) });

export const moveTicket = (ticketId: string, targetLane: string) =>
  fetcher<Ticket>(`/api/tickets/${ticketId}/move?target_lane=${targetLane}`, { method: "PUT" });

export const deleteTicket = (ticketId: string) =>
  fetcher<{ status: string }>(`/api/tickets/${ticketId}`, { method: "DELETE" });

export const updatePolicies = (ticketId: string, policies: Record<string, unknown>) =>
  fetcher<Ticket>(`/api/tickets/${ticketId}/policies`, { method: "PUT", body: JSON.stringify(policies) });

// AI
export const aiTriage = (text: string) =>
  fetcher<TriageResult>("/api/ai/triage", { method: "POST", body: JSON.stringify({ query: text }) });

export const aiSummarize = (ticketId: string) =>
  fetcher<{ summary: string }>(`/api/ai/summarize/${ticketId}`, { method: "POST" });

export const kbSearch = (query: string) =>
  fetcher<KBSearchResult>("/api/ai/kb/search", { method: "POST", body: JSON.stringify({ query }) });

export const getKBDrafts = () => fetcher<KBDraft[]>("/api/ai/kb/drafts");

export const approveKBDraft = (draftId: string) =>
  fetcher<{ status: string }>(`/api/ai/kb/drafts/${draftId}/approve`, { method: "POST" });

export const geminiChat = (message: string, apiKey: string, model: string) =>
  fetcher<{ reply: string }>("/api/ai/gemini-chat", {
    method: "POST",
    body: JSON.stringify({ message, api_key: apiKey, model }),
  });

// Agent Stream
export function streamAgent(ticketId: string, onMessage: (data: { message: string; progress: number; done?: boolean }) => void) {
  const evtSource = new EventSource(`/api/tickets/${ticketId}/agent/stream`);
  evtSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
    if (data.done) evtSource.close();
  };
  evtSource.onerror = () => evtSource.close();
  return () => evtSource.close();
}
