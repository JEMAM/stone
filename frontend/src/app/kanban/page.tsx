"use client";
import { useEffect, useState, useCallback } from "react";
import { getTickets, moveTicket, deleteTicket, aiSummarize, streamAgent, createTicket } from "@/lib/api";
import type { Ticket, TicketCreate } from "@/lib/types";
import { LANES } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  Incident: "bg-danger/20 text-danger border-danger/30",
  Bug: "bg-warning/20 text-warning border-warning/30",
  Feature: "bg-info/20 text-info border-info/30",
  Patch: "bg-brand/20 text-brand border-brand/30",
  Update: "bg-intangible/20 text-intangible border-intangible/30",
};

const COS_COLORS: Record<string, string> = {
  Expedite: "bg-expedite/15 text-expedite",
  "Fixed Date": "bg-fixed-date/15 text-fixed-date",
  Standard: "bg-standard/15 text-standard",
  Intangible: "bg-intangible/15 text-intangible",
};

export default function KanbanPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentProgress, setAgentProgress] = useState(0);
  const [agentRunning, setAgentRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getTickets();
      setTickets(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDrop = async (laneId: string, ticketId: string) => {
    setDragOver(null);
    try {
      await moveTicket(ticketId, laneId);
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Erro: ${msg}`);
    }
  };

  const handleRunAgent = (ticket: Ticket) => {
    setAgentLogs([]);
    setAgentProgress(0);
    setAgentRunning(true);
    streamAgent(ticket.id, (data) => {
      setAgentLogs((prev) => [...prev, data.message]);
      setAgentProgress(data.progress);
      if (data.done) {
        setAgentRunning(false);
        refresh();
      }
    });
  };

  const handleDelete = async (id: string) => {
    await deleteTicket(id);
    setSelected(null);
    refresh();
  };

  const handleSummarize = async (id: string) => {
    const res = await aiSummarize(id);
    setSelected((prev) => prev ? { ...prev, ai_summary: res.summary } : null);
    refresh();
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: TicketCreate = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      type: form.get("type") as string,
      class_of_service: form.get("cos") as string,
      assignee: form.get("assignee") as string,
    };
    await createTicket(data);
    setShowModal(false);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold text-text-high">Quadro Kanban</h2>
          <p className="text-sm text-text-medium">Fluxo de trabalho com limites WIP e políticas de saída</p>
        </div>
        <button onClick={() => setShowModal(true)} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
          + Novo Chamado
        </button>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {LANES.map((lane) => {
          const laneTickets = tickets.filter((t) => t.lane === lane.id);
          return (
            <div
              key={lane.id}
              className={`min-w-[260px] flex-1 rounded-2xl border p-3 transition-colors ${dragOver === lane.id ? "border-brand bg-brand/5" : "border-border-dark bg-surface-dark-card/50"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(lane.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                handleDrop(lane.id, id);
              }}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-medium">{lane.label}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-surface-dark px-2 py-0.5 text-[10px] font-bold text-text-low">{laneTickets.length}</span>
                  {lane.limit && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${laneTickets.length >= lane.limit ? "bg-danger/20 text-danger" : "bg-surface-dark text-text-low"}`}>
                      WIP: {lane.limit}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {laneTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", ticket.id)}
                    onClick={() => setSelected(ticket)}
                    className={`group cursor-pointer rounded-xl border border-border-dark bg-surface-dark p-3 transition-all hover:border-brand/30 hover:shadow-md hover:shadow-brand/5 ${
                      ticket.class_of_service === "Expedite" ? "border-l-2 border-l-danger" : ""
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap gap-1">
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${TYPE_COLORS[ticket.type] || ""}`}>
                        {ticket.type}
                      </span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${COS_COLORS[ticket.class_of_service] || ""}`}>
                        {ticket.class_of_service}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-text-high line-clamp-2">{ticket.title}</p>
                    <p className="mt-1 text-[10px] text-text-low">#{ticket.id} • {ticket.assignee}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-y-0 right-0 z-50 w-[420px] animate-slide-in border-l border-border-dark bg-surface-dark overflow-y-auto shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-dark bg-surface-dark/95 px-5 py-4 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-text-high">Chamado #{selected.id}</h3>
            <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-text-medium hover:bg-surface-dark-hover hover:text-text-high">✕</button>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${TYPE_COLORS[selected.type]}`}>{selected.type}</span>
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${COS_COLORS[selected.class_of_service]}`}>{selected.class_of_service}</span>
              </div>
              <h4 className="text-lg font-bold text-text-high">{selected.title}</h4>
              <p className="mt-2 text-sm text-text-medium">{selected.description}</p>
            </div>

            <div className="rounded-xl bg-surface-dark-card p-4 space-y-2">
              <p className="text-xs text-text-low">Atribuído a: <span className="text-text-high font-medium">{selected.assignee}</span></p>
              <p className="text-xs text-text-low">Coluna: <span className="text-text-high font-medium">{LANES.find(l => l.id === selected.lane)?.label}</span></p>
              {selected.lead_time && <p className="text-xs text-text-low">Lead Time: <span className="text-brand font-medium">{selected.lead_time.toFixed(1)} min</span></p>}
            </div>

            {/* Policies */}
            <div className="rounded-xl bg-surface-dark-card p-4">
              <h5 className="mb-2 text-xs font-bold uppercase text-text-low">Políticas de Saída</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`rounded-lg p-2 ${(selected.policies.code_coverage ?? 0) >= 80 ? "bg-brand/10 text-brand" : "bg-surface-dark text-text-low"}`}>
                  Cobertura: {selected.policies.code_coverage ?? "—"}%
                </div>
                <div className={`rounded-lg p-2 ${selected.policies.qa_approved ? "bg-brand/10 text-brand" : "bg-surface-dark text-text-low"}`}>
                  QA: {selected.policies.qa_approved ? "✓" : "✗"}
                </div>
                <div className={`rounded-lg p-2 ${selected.policies.docker_build_test ? "bg-brand/10 text-brand" : "bg-surface-dark text-text-low"}`}>
                  Docker: {selected.policies.docker_build_test ? "✓" : "✗"}
                </div>
                <div className={`rounded-lg p-2 ${selected.policies.doc_link ? "bg-brand/10 text-brand" : "bg-surface-dark text-text-low"}`}>
                  Docs: {selected.policies.doc_link ? "✓" : "✗"}
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {selected.ai_summary && (
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                <h5 className="mb-2 text-xs font-bold text-brand">Resumo IA</h5>
                <p className="text-xs text-text-medium whitespace-pre-line">{selected.ai_summary}</p>
              </div>
            )}

            {/* Chat Logs */}
            {selected.chat_logs && selected.chat_logs.length > 0 && (
              <div className="rounded-xl bg-surface-dark-card p-4">
                <h5 className="mb-2 text-xs font-bold uppercase text-text-low">Logs de Chat</h5>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selected.chat_logs.map((log, i) => (
                    <p key={i} className="text-xs text-text-medium font-mono">{log}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Error Logs */}
            {selected.error_logs && (
              <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
                <h5 className="mb-2 text-xs font-bold text-danger">Logs de Erro</h5>
                <pre className="text-xs text-danger/80 whitespace-pre-wrap font-mono">{selected.error_logs}</pre>
              </div>
            )}

            {/* Agent Runner */}
            <div className="space-y-2">
              {agentRunning && (
                <div className="rounded-xl bg-surface-dark-card p-4 space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-surface-dark">
                    <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${agentProgress}%` }} />
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {agentLogs.map((l, i) => (
                      <p key={i} className="text-[10px] text-text-medium font-mono">{l}</p>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => handleSummarize(selected.id)} className="flex-1 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors">
                  Gerar Resumo IA
                </button>
                <button onClick={() => handleRunAgent(selected)} disabled={agentRunning} className="flex-1 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition-colors disabled:opacity-50">
                  {agentRunning ? "Executando..." : "▶ Executar Agente"}
                </button>
              </div>
              <button onClick={() => handleDelete(selected.id)} className="w-full rounded-xl border border-danger/30 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors">
                Excluir Chamado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-2xl border border-border-dark bg-surface-dark-card p-6 shadow-2xl space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-high">Novo Chamado</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-text-medium hover:text-text-high">✕</button>
            </div>
            <input name="title" required placeholder="Título" className="w-full rounded-xl border border-border-dark bg-surface-dark px-4 py-2.5 text-sm text-text-high placeholder:text-text-low focus:border-brand focus:outline-none" />
            <textarea name="description" required placeholder="Descrição" rows={3} className="w-full rounded-xl border border-border-dark bg-surface-dark px-4 py-2.5 text-sm text-text-high placeholder:text-text-low focus:border-brand focus:outline-none resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <select name="type" className="rounded-xl border border-border-dark bg-surface-dark px-3 py-2.5 text-sm text-text-high focus:border-brand focus:outline-none">
                <option value="Bug">Bug</option>
                <option value="Feature">Feature</option>
                <option value="Incident">Incident</option>
                <option value="Patch">Patch</option>
              </select>
              <select name="cos" className="rounded-xl border border-border-dark bg-surface-dark px-3 py-2.5 text-sm text-text-high focus:border-brand focus:outline-none">
                <option value="Standard">Standard</option>
                <option value="Expedite">Expedite</option>
                <option value="Fixed Date">Fixed Date</option>
                <option value="Intangible">Intangible</option>
              </select>
            </div>
            <input name="assignee" required placeholder="Atribuir a" className="w-full rounded-xl border border-border-dark bg-surface-dark px-4 py-2.5 text-sm text-text-high placeholder:text-text-low focus:border-brand focus:outline-none" />
            <button type="submit" className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover transition-colors">
              Criar Chamado
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
