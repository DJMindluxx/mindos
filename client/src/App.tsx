import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import Erfassen from "./pages/Erfassen";
import Eintraege from "./pages/Eintraege";
import Charts from "./pages/Charts";
import Einstellungen from "./pages/Einstellungen";

// ── NAV ITEMS ─────────────────────────────────────────────────────────────────
const NAV = [
  {
    id: "dashboard",
    label: "Cockpit",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    id: "erfassen",
    label: "Erfassen",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <circle cx="12" cy="12" r="9"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    id: "eintraege",
    label: "Einträge",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    id: "charts",
    label: "Charts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Setup",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0M20.49 9a10 10 0 0 0-8.56-4.94M3.51 9a10 10 0 0 0-.07 1M3.51 15a10 10 0 0 0 8.56 4.94M20.49 15a10 10 0 0 0 .07-1"/>
      </svg>
    ),
  },
] as const;

type NavId = typeof NAV[number]["id"];

export default function App() {
  const [active, setActive] = useState<NavId>("dashboard");

  const views: Record<NavId, React.ReactNode> = {
    dashboard: <Dashboard onNavigate={(id: NavId) => setActive(id)} />,
    erfassen: <Erfassen onSuccess={() => setActive("eintraege")} />,
    eintraege: <Eintraege />,
    charts: <Charts />,
    settings: <Einstellungen />,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
        {/* View */}
        <div key={active} className="animate-fade-up">
          {views[active]}
        </div>

        {/* Bottom Nav */}
        <nav className="bottom-nav" data-testid="bottom-nav">
          <div className="grid grid-cols-5 h-full items-center px-1">
            {NAV.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  data-testid={`nav-${item.id}`}
                  onClick={() => setActive(item.id)}
                  className="flex flex-col items-center justify-center gap-1 py-2 transition-colors duration-150"
                  style={{
                    color: isActive ? "var(--gold)" : "var(--faint)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <span style={{ transform: isActive ? "scale(1.12)" : "scale(1)", transition: "transform .18s" }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: "9px", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: isActive ? 600 : 400 }}>
                    {item.label}
                  </span>
                  <span style={{
                    width: "4px", height: "4px", borderRadius: "999px",
                    background: "var(--gold)",
                    opacity: isActive ? 1 : 0,
                    transition: "opacity .18s",
                  }} />
                </button>
              );
            })}
          </div>
        </nav>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
