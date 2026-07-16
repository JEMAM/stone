"use client";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 w-full">
      {/* Main Header Bar */}
      <div className="flex h-14 items-center justify-between border-b border-border-dark bg-surface-dark/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2 text-sm text-text-medium">
          <span className="text-brand">●</span>
          <span>Sistema operacional</span>
          <span className="text-text-low">•</span>
          <span className="text-text-low">FastAPI :8000 ↔ Next.js :3000</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Ao Vivo
          </span>
          <button className="rounded-xl border border-border-dark bg-surface-dark-card px-4 py-1.5 text-xs font-medium text-text-medium transition-colors hover:border-brand/40 hover:text-text-high">
            Redefinir Métricas
          </button>
        </div>
      </div>
    </header>
  );
}
