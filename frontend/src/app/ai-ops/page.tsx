"use client";
import { useState } from "react";
import { kbSearch, getKBDrafts, approveKBDraft, geminiChat } from "@/lib/api";
import type { KBSearchResult, KBDraft } from "@/lib/types";
import { GEMINI_MODELS } from "@/lib/types";

export default function AiOpsPage() {
  // Triage
  const [triageText, setTriageText] = useState("");
  const [triageResult, setTriageResult] = useState<Record<string, string> | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);

  // KB Search
  const [kbQuery, setKbQuery] = useState("");
  const [kbResults, setKbResults] = useState<KBSearchResult | null>(null);
  const [drafts, setDrafts] = useState<KBDraft[]>([]);

  // Gemini Chat
  const [apiKey, setApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState<string>(GEMINI_MODELS[0].id);
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleTriage = async () => {
    if (!triageText.trim()) return;
    setTriageLoading(true);
    try {
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: triageText }),
      });
      const data = await res.json();
      setTriageResult(data);
    } catch (e) { console.error(e); }
    setTriageLoading(false);
  };

  const handleKBSearch = async () => {
    if (!kbQuery.trim()) return;
    try {
      const data = await kbSearch(kbQuery);
      setKbResults(data);
      if (data.gap_detected) {
        const d = await getKBDrafts();
        setDrafts(d);
      }
    } catch (e) { console.error(e); }
  };

  const handleApproveDraft = async (id: string) => {
    await approveKBDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleGeminiSend = async () => {
    if (!chatInput.trim() || !apiKey.trim()) return;
    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await geminiChat(userMsg, apiKey, geminiModel);
      setChatMessages((prev) => [...prev, { role: "assistant", text: res.reply }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setChatMessages((prev) => [...prev, { role: "assistant", text: `Erro: ${msg}` }]);
    }
    setChatLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold text-text-high">Operações IA</h2>
        <p className="text-sm text-text-medium">Motor de IA Agêntica — Triagem, Base de Conhecimento e Chat Gemini</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Triage */}
        <div className="glass-panel animate-fade-in-up p-5 space-y-4">
          <h3 className="text-sm font-bold text-text-high flex items-center gap-2">🔍 Analisador de Triagem Inteligente</h3>
          <textarea
            value={triageText}
            onChange={(e) => setTriageText(e.target.value)}
            placeholder="Cole o texto do incidente ou chat do usuário aqui..."
            rows={4}
            className="w-full rounded-xl border border-border-dark bg-surface-dark px-4 py-3 text-sm text-text-high placeholder:text-text-low focus:border-brand focus:outline-none resize-none"
          />
          <button
            onClick={handleTriage}
            disabled={triageLoading}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors disabled:opacity-50"
          >
            {triageLoading ? "Analisando..." : "Analisar com IA"}
          </button>
          {triageResult && (
            <div className="space-y-2 rounded-xl border border-brand/20 bg-brand/5 p-4 animate-fade-in-up">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-surface-dark p-2"><span className="text-text-low">Tipo:</span> <span className="text-text-high font-bold">{triageResult.type}</span></div>
                <div className="rounded-lg bg-surface-dark p-2"><span className="text-text-low">Classe:</span> <span className="text-text-high font-bold">{triageResult.class_of_service}</span></div>
                <div className="rounded-lg bg-surface-dark p-2"><span className="text-text-low">Squad:</span> <span className="text-text-high font-bold">{triageResult.squad}</span></div>
                <div className="rounded-lg bg-surface-dark p-2"><span className="text-text-low">Impacto:</span> <span className="text-text-high font-bold">{triageResult.impact}</span></div>
              </div>
              <p className="text-xs text-text-medium mt-2">{triageResult.reasoning}</p>
            </div>
          )}
        </div>

        {/* KB Search */}
        <div className="glass-panel animate-fade-in-up p-5 space-y-4 delay-100">
          <h3 className="text-sm font-bold text-text-high flex items-center gap-2">📚 Base de Conhecimento Semântica</h3>
          <div className="flex gap-2">
            <input
              value={kbQuery}
              onChange={(e) => setKbQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleKBSearch()}
              placeholder="Consulte a base (ex: 'container postgres')"
              className="flex-1 rounded-xl border border-border-dark bg-surface-dark px-4 py-2.5 text-sm text-text-high placeholder:text-text-low focus:border-brand focus:outline-none"
            />
            <button onClick={handleKBSearch} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
              Buscar
            </button>
          </div>

          {kbResults && (
            <div className="space-y-3 animate-fade-in-up">
              {kbResults.results.length > 0 ? (
                kbResults.results.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border-dark bg-surface-dark p-4 space-y-2">
                    <h4 className="text-sm font-bold text-text-high">{r.title}</h4>
                    {r.sections.map((s, i) => (
                      <div key={i} className="rounded-lg bg-surface-dark-card p-3">
                        <p className="text-xs font-semibold text-brand mb-1">{s.subtitle} <span className="text-text-low">(score: {s.score})</span></p>
                        <p className="text-xs text-text-medium" dangerouslySetInnerHTML={{ __html: s.content }} />
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                  <p className="text-xs text-warning font-semibold">⚠️ Lacuna detectada — Rascunho de artigo gerado automaticamente</p>
                </div>
              )}
            </div>
          )}

          {/* Drafts */}
          {drafts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-text-low">Rascunhos para Aprovação</h4>
              {drafts.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl border border-border-dark bg-surface-dark p-3">
                  <div>
                    <p className="text-xs font-semibold text-text-high">{d.title}</p>
                    <p className="text-[10px] text-text-low">Query: {d.query}</p>
                  </div>
                  <button onClick={() => handleApproveDraft(d.id)} className="rounded-lg bg-brand px-3 py-1.5 text-[10px] font-bold text-white hover:bg-brand-hover">
                    Aprovar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gemini Chat - Full Width */}
      <div className="glass-panel animate-fade-in-up p-5 space-y-4 delay-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-high flex items-center gap-2">🤖 Análise de Processos via Chat Gemini</h3>
          <div className="flex items-center gap-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key do Gemini"
              className="w-48 rounded-xl border border-border-dark bg-surface-dark px-3 py-1.5 text-xs text-text-high placeholder:text-text-low focus:border-brand focus:outline-none"
            />
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="rounded-xl border border-border-dark bg-surface-dark px-3 py-1.5 text-xs text-text-high focus:border-brand focus:outline-none"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="h-72 space-y-3 overflow-y-auto rounded-xl border border-border-dark bg-surface-dark p-4">
          {chatMessages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-low">Pergunte sobre processos ITSM, métricas DORA, ou análise de fluxo...</p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-brand text-white rounded-br-md"
                  : "bg-surface-dark-card text-text-medium border border-border-dark rounded-bl-md"
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-surface-dark-card border border-border-dark px-4 py-3 rounded-bl-md">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleGeminiSend()}
            placeholder="Pergunte sobre processos, gargalos, SLA..."
            className="flex-1 rounded-xl border border-border-dark bg-surface-dark px-4 py-3 text-sm text-text-high placeholder:text-text-low focus:border-brand focus:outline-none"
          />
          <button
            onClick={handleGeminiSend}
            disabled={chatLoading || !apiKey.trim()}
            className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover transition-colors disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
