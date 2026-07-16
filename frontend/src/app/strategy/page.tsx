export default function StrategyPage() {
  const pillars = [
    {
      icon: "🚀",
      title: "Deploy Contínuo",
      desc: "Pipeline CI/CD com 8.4 deploys/semana, gates de qualidade automatizados e rollback instantâneo via feature flags.",
      metric: "8.4/sem",
      metricLabel: "Freq. Deploy",
    },
    {
      icon: "⚡",
      title: "Resolução Zero-Touch",
      desc: "Agentes autônomos MCP resolvem chamados de infraestrutura sem intervenção humana, reduzindo MTTR para < 30 min.",
      metric: "< 30 min",
      metricLabel: "MTTR",
    },
    {
      icon: "🤖",
      title: "IA Agêntica",
      desc: "Triagem inteligente, geração automática de KB, e chat Gemini para análise de processos em tempo real.",
      metric: "94%",
      metricLabel: "Confiança",
    },
    {
      icon: "📊",
      title: "Métricas DORA",
      desc: "Monitoramento contínuo dos 4 pilares DORA com feedback loop para melhoria contínua do fluxo de valor.",
      metric: "Elite",
      metricLabel: "Classificação",
    },
  ];

  const actionItems = [
    { phase: "Q3 2026", title: "Integração DORA Completa", status: "Em Andamento", color: "bg-brand" },
    { phase: "Q3 2026", title: "Agentes Zero-Touch v2", status: "Em Andamento", color: "bg-brand" },
    { phase: "Q4 2026", title: "Observabilidade Preditiva", status: "Planejado", color: "bg-warning" },
    { phase: "Q4 2026", title: "Self-Service Portal 2.0", status: "Planejado", color: "bg-warning" },
    { phase: "Q1 2027", title: "Escalar para 50+ Squads", status: "Futuro", color: "bg-info" },
    { phase: "Q1 2027", title: "Certificação ITIL v4", status: "Futuro", color: "bg-info" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#003D1C_0%,#00A868_50%,#6DFFB9_100%)] p-5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative z-10">
          <span className="mb-2 inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            🎯 Stone FinOps Excellence Strategy
          </span>
          <h2 className="text-xl font-bold text-white">
            Estratégia Operacional Stone
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-white/90 leading-relaxed">
            Transformando operações de varejo com ITSM preditivo, métricas DORA em tempo real e resolução autônoma via IA Agêntica.
            Nosso objetivo: alcançar classificação DORA &quot;Elite&quot; em todos os pilares até Q1 2027.
          </p>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Taxa de Falha", value: "< 5%", trend: "↓", trendColor: "text-brand" },
          { label: "Lead Time", value: "42 min", trend: "↓", trendColor: "text-brand" },
          { label: "CSAT", value: "> 95%", trend: "↑", trendColor: "text-brand" },
          { label: "Self-Service", value: "> 50%", trend: "↑", trendColor: "text-brand" },
        ].map((kpi, i) => (
          <div key={i} className="glass-panel animate-fade-in-up flex items-center justify-between p-3.5" style={{ animationDelay: `${i * 100}ms` }}>
            <div>
              <p className="text-[10px] text-text-low">{kpi.label}</p>
              <p className="text-xl font-bold text-white">{kpi.value}</p>
            </div>
            <span className={`text-xl font-bold ${kpi.trendColor}`}>{kpi.trend}</span>
          </div>
        ))}
      </div>

      {/* Pillars */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-white animate-fade-in-up">Pilares Operacionais</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {pillars.map((p, i) => (
            <div key={i} className="glass-panel animate-fade-in-up group p-4 transition-all hover:border-brand/30 hover:shadow-md hover:shadow-brand/5" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-xl">{p.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">{p.title}</h4>
                    <p className="text-[9px] text-text-low">{p.metricLabel}</p>
                  </div>
                </div>
                <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-[10px] font-bold text-brand">{p.metric}</span>
              </div>
              <p className="mt-2 text-xs text-text-medium leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-white animate-fade-in-up">Plano de Ação</h3>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          {actionItems.map((item, i) => (
            <div key={i} className="glass-panel animate-fade-in-up flex items-center gap-3 p-3" style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`h-8 w-1 rounded-full ${item.color}`} />
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">{item.title}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-[9px] text-text-low">{item.phase}</span>
                  <span className={`rounded-full px-2 py-0.25 text-[9px] font-bold ${
                    item.status === "Em Andamento" ? "bg-brand/15 text-brand" :
                    item.status === "Planejado" ? "bg-warning/15 text-warning" :
                    "bg-info/15 text-info"
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
