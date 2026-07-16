"use client";
import { useEffect, useState, useCallback } from "react";
import { getMetrics } from "@/lib/api";
import type { Metrics } from "@/lib/types";
import DoraChart from "@/components/dashboard/DoraChart";
import SlaChart from "@/components/dashboard/SlaChart";

const METRIC_CONFIG = [
  { key: "deployment_frequency", label: "Frequência de Deploy", unit: "/sem", icon: "🚀", color: "text-brand", target: "> 7", good: (v: number) => v >= 7 },
  { key: "lead_time_for_changes", label: "Lead Time de Mudanças", unit: " min", icon: "⏱️", color: "text-info", target: "< 60", good: (v: number) => v < 60 },
  { key: "change_failure_rate", label: "Taxa de Falha", unit: "%", icon: "⚠️", color: "text-warning", target: "< 5%", good: (v: number) => v < 5 },
  { key: "mean_time_to_restore", label: "MTTR", unit: " min", icon: "🔧", color: "text-danger", target: "< 30", good: (v: number) => v < 30 },
  { key: "first_response_time", label: "Tempo 1ª Resposta", unit: "s", icon: "💬", color: "text-brand", target: "< 20s", good: (v: number) => v < 20 },
  { key: "first_call_resolution", label: "Resolução 1º Contato", unit: "%", icon: "✅", color: "text-success", target: "> 75%", good: (v: number) => v > 75 },
  { key: "self_service_adoption", label: "Adoção Self-Service", unit: "%", icon: "🤖", color: "text-info", target: "> 50%", good: (v: number) => v > 50 },
  { key: "customer_satisfaction", label: "CSAT", unit: "%", icon: "⭐", color: "text-brand", target: "> 95%", good: (v: number) => v > 95 },
] as const;

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getMetrics();
      setMetrics(data);
    } catch (e) {
      console.error("Metrics fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold text-text-high">Painel Principal</h2>
        <p className="mt-1 text-sm text-text-medium">
          Métricas DORA e ITSM em tempo real — Ecossistema Stone
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRIC_CONFIG.map((cfg, i) => {
          const value = metrics ? metrics[cfg.key as keyof Metrics] : 0;
          const isGood = cfg.good(value);
          return (
            <div
              key={cfg.key}
              className={`animate-fade-in-up glass-panel group relative overflow-hidden p-5 transition-all duration-300 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 animate-shimmer opacity-0 transition-opacity group-hover:opacity-100" />

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{cfg.icon}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isGood ? "bg-brand/15 text-brand" : "bg-danger/15 text-danger"}`}>
                    {isGood ? "✓ Meta" : "✗ Alerta"}
                  </span>
                </div>
                <div className="mt-3">
                  <p className={`text-3xl font-bold ${cfg.color}`}>
                    {metrics ? value : "—"}
                    <span className="text-sm font-normal text-text-low">{cfg.unit}</span>
                  </p>
                  <p className="mt-1 text-xs text-text-medium">{cfg.label}</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-dark">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${isGood ? "bg-brand" : "bg-danger"}`}
                      style={{ width: `${Math.min(100, Math.max(5, isGood ? 85 : 45))}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-low">Meta: {cfg.target}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      {metrics && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-in-up delay-300">
          <div className="glass-panel p-6">
            <h3 className="mb-4 text-base font-bold text-text-high flex items-center gap-2">
              <span>📈</span> Índice DORA Escalado
            </h3>
            <DoraChart metrics={metrics} />
          </div>
          <div className="glass-panel p-6">
            <h3 className="mb-4 text-base font-bold text-text-high flex items-center gap-2">
              <span>📊</span> Experiência de Suporte & SLAs
            </h3>
            <SlaChart metrics={metrics} />
          </div>
        </div>
      )}

      {/* Bottom Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* DORA Summary */}
        <div className="glass-panel animate-fade-in-up p-6 delay-500">
          <h3 className="mb-4 text-lg font-semibold text-text-high">Resumo DORA</h3>
          <div className="space-y-4">
            {["deployment_frequency", "lead_time_for_changes", "change_failure_rate", "mean_time_to_restore"].map((key) => {
              const cfg = METRIC_CONFIG.find((c) => c.key === key)!;
              const value = metrics ? metrics[key as keyof Metrics] : 0;
              const isGood = cfg.good(value);
              return (
                <div key={key} className="flex items-center justify-between rounded-xl bg-surface-dark/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span>{cfg.icon}</span>
                    <span className="text-sm text-text-medium">{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isGood ? "text-brand" : "text-danger"}`}>
                      {metrics ? value : "—"}{cfg.unit}
                    </span>
                    <span className={`h-2 w-2 rounded-full ${isGood ? "bg-brand" : "bg-danger"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ITSM Summary */}
        <div className="glass-panel animate-fade-in-up p-6 delay-600">
          <h3 className="mb-4 text-lg font-semibold text-text-high">Resumo ITSM</h3>
          <div className="space-y-4">
            {["first_response_time", "first_call_resolution", "self_service_adoption", "customer_satisfaction"].map((key) => {
              const cfg = METRIC_CONFIG.find((c) => c.key === key)!;
              const value = metrics ? metrics[key as keyof Metrics] : 0;
              const isGood = cfg.good(value);
              return (
                <div key={key} className="flex items-center justify-between rounded-xl bg-surface-dark/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span>{cfg.icon}</span>
                    <span className="text-sm text-text-medium">{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isGood ? "text-brand" : "text-danger"}`}>
                      {metrics ? value : "—"}{cfg.unit}
                    </span>
                    <span className={`h-2 w-2 rounded-full ${isGood ? "bg-brand" : "bg-danger"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
