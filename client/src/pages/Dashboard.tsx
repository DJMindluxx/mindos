import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Entry, Settings } from "@shared/schema";
import { fmt, fmtMin, fmtHours, computeStats, buildTimeline } from "@/lib/finance";
import AppHeader from "@/components/shared/AppHeader";
import InstallBanner from "@/components/shared/InstallBanner";

interface DashboardProps {
  onNavigate: (id: any) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: entries = [] } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
    queryFn: () => apiRequest("GET", "/api/entries").then(r => r.json()),
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: () => apiRequest("GET", "/api/settings").then(r => r.json()),
  });

  const s = computeStats(entries);
  const goal = settings?.monthlyGoal ?? 3000;
  const goalPct = Math.min(100, (s.netMonth / goal) * 100);
  const remaining = Math.max(0, goal - s.netMonth);

  return (
    <div className="view-content">
      <AppHeader
        eyebrow="Business Cockpit"
        title="MindOS"
        icon={
          <svg viewBox="0 0 64 64" fill="none" className="w-7 h-7">
            <rect x="7" y="7" width="50" height="50" rx="16" stroke="currentColor" strokeWidth="2.6"/>
            <path d="M18 40V22L32 36L46 22V40" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
      />

      <InstallBanner />

      <div className="flex flex-col gap-4">
        {/* HERO KPI */}
        <div className="glass-panel p-5">
          <div style={{ fontSize: "10px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 10 }}>
            Netto diesen Monat
          </div>
          <div
            data-testid="net-month"
            className="tabular"
            style={{ fontSize: "clamp(2.6rem,8vw,4.6rem)", fontWeight: 700, letterSpacing: "-.07em", lineHeight: .92, color: "var(--text)" }}
          >
            {fmt(s.netMonth)}
          </div>
          <div className="gold-divider" />
          <div className="flex flex-col gap-0">
            {[
              { label: "Brutto bezahlt", val: fmt(s.grossMonth) },
              { label: "Rücklage INPS + Steuer", val: fmt(s.reserveMonth) },
              { label: "Heute netto", val: fmt(s.todayNet) },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between items-center py-3" style={{ borderTop: "1px solid rgba(255,255,255,.045)" }}>
                <span style={{ color: "var(--muted-text)", fontSize: 13 }}>{label}</span>
                <strong className="tabular" style={{ fontSize: 15 }}>{val}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* MONATSZIEL */}
        <div
          style={{
            background: "rgba(255,255,255,.025)",
            border: "1px solid rgba(255,255,255,.05)",
            borderRadius: 20,
            padding: 16,
          }}
        >
          <div className="flex justify-between items-end gap-3 mb-1">
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted-text)", marginBottom: 6 }}>
                Monatsziel netto
              </div>
              <div className="tabular" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.04em" }}>
                {fmt(goal)}
              </div>
            </div>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: 999,
                background: "var(--gold-soft)", border: "1px solid rgba(205,168,104,.16)",
                color: "var(--gold)", fontSize: 11, fontWeight: 600,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />
              <span data-testid="goal-percent">{goalPct.toFixed(0)}%</span>
            </div>
          </div>
          <div className="progress-track mt-4">
            <div className="progress-bar" style={{ width: `${goalPct}%` }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 10 }}>
            {remaining > 0
              ? `Noch ${fmt(remaining)} bis zum Ziel.`
              : "Monatsziel erreicht!"}
          </div>
        </div>

        {/* CALL AGENT MINUTES */}
        <div
          style={{
            background: "rgba(110,167,164,.07)",
            border: "1px solid rgba(110,167,164,.14)",
            borderRadius: 20,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#8bbab7", marginBottom: 6 }}>
            Call-Agent Minuten diesen Monat
          </div>
          <div className="tabular" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.04em" }}>
            {fmtMin(s.callMinutesMonth)}
          </div>
        </div>

        {/* MARKEN-BLICK */}
        <div className="glass-panel p-5">
          <div className="flex justify-between items-end mb-4">
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.3rem,3.5vw,1.7rem)", fontWeight: 600 }}>
              Marken-Blick
            </h2>
            <span style={{ color: "var(--muted-text)", fontSize: 12 }}>Netto pro Säule</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { name: "Mindsound", val: s.mindsoundNet, color: "var(--gold)" },
              { name: "Mindconsulting", val: s.mindconsultingNet, color: "var(--teal)" },
              { name: "Call-Agent", val: s.callAgentNet, color: "var(--success)" },
            ].map(({ name, val, color }) => (
              <div
                key={name}
                className="flex justify-between items-center px-4 py-3"
                style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 16 }}
              >
                <span style={{ fontWeight: 500, fontSize: 14, color }}>{name}</span>
                <span className="tabular" style={{ color: "var(--muted-text)", fontSize: 14 }}>{fmt(val)}</span>
              </div>
            ))}
          </div>
          <div className="gold-divider" />
          <div className="flex flex-col gap-0">
            {[
              { label: "Offen", val: fmt(s.openGross), color: "var(--warning)" },
              { label: "Erwartet", val: fmt(s.expectedGross), color: "var(--teal)" },
              { label: "Noch bis Ziel", val: fmt(remaining), color: "var(--text)" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex justify-between items-center py-3" style={{ borderTop: "1px solid rgba(255,255,255,.045)" }}>
                <span style={{ color: "var(--muted-text)", fontSize: 13 }}>{label}</span>
                <strong className="tabular" style={{ fontSize: 15, color }}>{val}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* MINI KPI GRID */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "Heute netto", v: fmt(s.todayNet), s: "heutige Einträge" },
            { k: "Call brutto", v: fmt(s.callGrossMonth), s: "diesen Monat" },
            { k: "Offen", v: fmt(s.openGross), s: "unbezahlt" },
            { k: "Erwartet", v: fmt(s.expectedGross), s: "Pipeline" },
          ].map(({ k, v, s: sub }) => (
            <div
              key={k}
              className="p-4"
              style={{ background: "rgba(255,255,255,.022)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 18 }}
            >
              <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 8 }}>{k}</div>
              <div className="tabular" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.04em" }}>{v}</div>
              <div style={{ marginTop: 4, color: "var(--muted-text)", fontSize: 11 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* CALL STATS */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: "Call-Min. heute", v: `${Math.round(s.callMinutesToday)}` },
            { k: "Call-Std. Monat", v: fmtHours(s.callMinutesMonth) },
            { k: "Ø €/Minute", v: s.avgMinuteRate.toFixed(3) },
          ].map(({ k, v }) => (
            <div
              key={k}
              className="p-4"
              style={{ background: "rgba(110,167,164,.07)", border: "1px solid rgba(110,167,164,.14)", borderRadius: 18 }}
            >
              <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "#8bbab7", marginBottom: 6 }}>{k}</div>
              <div className="tabular" style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.04em" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Quick-add CTA */}
        <button
          onClick={() => onNavigate("erfassen")}
          className="w-full flex items-center justify-center gap-2 py-4"
          style={{
            background: "linear-gradient(135deg, rgba(205,168,104,.18), rgba(205,168,104,.08))",
            border: "1px solid rgba(205,168,104,.28)",
            borderRadius: 18,
            color: "var(--gold)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: ".04em",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <circle cx="12" cy="12" r="9"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Neue Bewegung erfassen
        </button>
      </div>
    </div>
  );
}
