"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Painel Principal", icon: "📊" },
  { href: "/kanban", label: "Quadro Kanban", icon: "📋" },
  { href: "/ai-ops", label: "Operações IA", icon: "🤖" },
  { href: "/strategy", label: "Estratégia Stone", icon: "🎯" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      if (saved === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border-dark bg-surface-dark">
      {/* Logo */}
      <div className="flex flex-col gap-1 border-b border-border-dark px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white tracking-wider">ANTIGRAVITY</span>
        </div>
        <p className="text-[10px] tracking-wider text-text-low font-bold uppercase">ITSM & Agentic AI</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-brand/15 text-brand shadow-[inset_0_0_0_1px_rgba(0,168,104,0.2)]"
                  : "text-text-medium hover:bg-surface-dark-hover hover:text-text-high"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand animate-pulse-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme Switcher Button */}
      <div className="px-4 py-2.5 border-t border-border-dark">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-text-medium hover:bg-surface-dark-hover hover:text-white transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            <span>{theme === "dark" ? "☀️" : "🌙"}</span>
            <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          </span>
          <span className="rounded-full bg-surface-dark-card px-2 py-0.5 text-[9px] text-text-low uppercase font-bold border border-border-dark">
            {theme}
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-border-dark px-4 py-4">
        <div className="glass-panel flex items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">
            ST
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-text-high">Stone FinOps</p>
            <p className="text-[10px] text-text-low">v2.0 — Next.js</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
