import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { Entry } from "@shared/schema";
import { computeStats, buildTimeline, currentMonth } from "@/lib/finance";
import AppHeader from "@/components/shared/AppHeader";

declare global {
  interface Window {
    Chart: any;
  }
}

export default function Charts() {
  const { data: entries = [] } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
    queryFn: () => apiRequest("GET", "/api/entries").then(r => r.json()),
  });

  const donutRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<HTMLCanvasElement>(null);
  const donutChart = useRef<any>(null);
  const lineChart = useRef<any>(null);

  const s = computeStats(entries);
  const timeline = buildTimeline(entries);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js";
    script.onload = () => renderCharts();
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  useEffect(() => {
    if (window.Chart) renderCharts();
  }, [entries]);

  function renderCharts() {
    if (!window.Chart) return;

    // ── DONUT ─────────────────────────────────────────────────────────────────
    if (donutRef.current) {
      if (donutChart.current) donutChart.current.destroy();
      const total = s.mindsoundNet + s.mindconsultingNet + s.callAgentNet;
      donutChart.current = new window.Chart(donutRef.current, {
        type: "doughnut",
        data: {
          labels: ["Mindsound", "Mindconsulting", "Call-Agent"],
          datasets: [{
            data: [s.mindsoundNet, s.mindconsultingNet, s.callAgentNet],
            backgroundColor: ["rgba(205,168,104,.75)", "rgba(110,167,164,.75)", "rgba(115,181,141,.75)"],
            borderColor: ["#cda868", "#6ea7a4", "#73b58d"],
            borderWidth: 1.5,
            hoverOffset: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#a89e92",
                font: { family: "'DM Sans', system-ui", size: 12 },
                padding: 16,
                usePointStyle: true,
                pointStyleWidth: 8,
              },
            },
            tooltip: {
              backgroundColor: "#231d28",
              borderColor: "rgba(255,255,255,.08)",
              borderWidth: 1,
              titleColor: "#f0e8dd",
              bodyColor: "#a89e92",
              callbacks: {
                label: (ctx: any) => {
                  const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : "0";
                  return ` ${new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(ctx.parsed)} (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }

    // ── LINE ──────────────────────────────────────────────────────────────────
    if (lineRef.current) {
      if (lineChart.current) lineChart.current.destroy();
      lineChart.current = new window.Chart(lineRef.current, {
        type: "line",
        data: {
          labels: timeline.map((t) => t.label),
          datasets: [{
            label: "Netto kumulativ (€)",
            data: timeline.map((t) => t.value),
            borderColor: "#cda868",
            backgroundColor: "rgba(205,168,104,.08)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#cda868",
            pointBorderColor: "#0c0a0d",
            pointBorderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#231d28",
              borderColor: "rgba(255,255,255,.08)",
              borderWidth: 1,
              titleColor: "#f0e8dd",
              bodyColor: "#cda868",
              callbacks: {
                label: (ctx: any) =>
                  ` ${new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: "rgba(255,255,255,.04)" },
              ticks: { color: "#6a6060", font: { family: "'DM Sans',system-ui", size: 11 } },
            },
            y: {
              grid: { color: "rgba(255,255,255,.04)" },
              ticks: {
                color: "#6a6060",
                font: { family: "'DM Sans',system-ui", size: 11 },
                callback: (v: number) => new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", notation: "compact" }).format(v),
              },
            },
          },
        },
      });
    }
  }

  const month = currentMonth();

  return (
    <div className="view-content">
      <AppHeader
        eyebrow="Visualisierung"
        title="Charts"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="glass-panel p-5">
          <div className="flex justify-between items-end mb-4">
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.3rem,3.5vw,1.7rem)", fontWeight: 600 }}>
              Netto nach Bereich
            </h2>
          </div>
          <div style={{ height: 260, position: "relative" }}>
            <canvas ref={donutRef} />
          </div>
          <p style={{ marginTop: 12, color: "var(--muted-text)", fontSize: 12 }}>
            Bezahlte Einnahmen {month} nach Brand.
          </p>
        </div>

        <div className="glass-panel p-5">
          <div className="flex justify-between items-end mb-4">
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.3rem,3.5vw,1.7rem)", fontWeight: 600 }}>
              Monatsverlauf
            </h2>
          </div>
          <div style={{ height: 240, position: "relative" }}>
            {timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: "var(--faint)" }}>
                <p style={{ fontSize: 13 }}>Noch keine bezahlten Einträge diesen Monat.</p>
              </div>
            ) : (
              <canvas ref={lineRef} />
            )}
          </div>
          <p style={{ marginTop: 12, color: "var(--muted-text)", fontSize: 12 }}>
            Tagesgenaue Netto-Entwicklung im aktuellen Monat.
          </p>
        </div>
      </div>
    </div>
  );
}
