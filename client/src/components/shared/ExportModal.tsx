import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Entry } from "@shared/schema";
import { currentMonth } from "@/lib/finance";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

const BUSINESSES = ["Mindsound", "Mindconsulting", "Call-Agent"];

// Build list of months available in entries + current month
function buildMonthOptions(entries: Entry[]): { value: string; label: string }[] {
  const months = new Set<string>();
  months.add(currentMonth());
  for (const e of entries) {
    const m = e.date?.slice(0, 7);
    if (m) months.add(m);
  }
  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .map((m) => {
      const [y, mo] = m.split("-");
      const label = new Date(`${m}-01`).toLocaleDateString("de-AT", { month: "long", year: "numeric" });
      return { value: m, label };
    });
}

export default function ExportModal({ open, onClose }: ExportModalProps) {
  const [month, setMonth] = useState(currentMonth());
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: entries = [] } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
    queryFn: () => apiRequest("GET", "/api/entries").then((r) => r.json()),
  });

  const monthOptions = buildMonthOptions(entries);

  function toggleSector(s: string) {
    setSectors((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, sectors }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Fehler beim Export" }));
        throw new Error(err.error ?? "Unbekannter Fehler");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MindOS_Export_${month || "alle"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Export fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 500,
    background: "rgba(0,0,0,.72)",
    backdropFilter: "blur(8px)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    padding: "0 0 env(safe-area-inset-bottom, 0px) 0",
  };

  const sheet: React.CSSProperties = {
    width: "100%", maxWidth: 540,
    background: "var(--panel-3)",
    border: "1px solid rgba(205,168,104,.18)",
    borderRadius: "24px 24px 0 0",
    padding: "8px 20px 32px",
    animation: "fadeSlideUp .22s ease",
  };

  const label: React.CSSProperties = {
    fontSize: 10, letterSpacing: ".22em",
    textTransform: "uppercase", color: "var(--faint)",
    display: "block", marginBottom: 8,
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", minHeight: 48, borderRadius: 14,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.04)",
    padding: "0 42px 0 14px", color: "var(--text)",
    fontFamily: "'DM Sans', system-ui", fontSize: 15,
    outline: "none", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23cda868' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
    backgroundSize: "16px",
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={sheet}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 999, background: "rgba(255,255,255,.12)", margin: "10px auto 20px" }} />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: "rgba(205,168,104,.12)", border: "1px solid rgba(205,168,104,.2)",
            display: "grid", placeItems: "center", color: "var(--gold)",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--faint)" }}>PDF erstellen</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, letterSpacing: "-.03em", color: "var(--text)" }}>
              Rechnung exportieren
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* Zeitraum */}
          <div>
            <label style={label}>Zeitraum</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={selectStyle}
            >
              <option value="">Alle Zeiträume</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Bereiche */}
          <div>
            <label style={label}>Bereiche {sectors.length > 0 ? `(${sectors.length} gewählt)` : "(alle)"}</label>
            <div className="flex gap-2 flex-wrap">
              {BUSINESSES.map((b) => {
                const active = sectors.includes(b);
                const colors: Record<string, { bg: string; border: string; text: string }> = {
                  Mindsound:       { bg: "rgba(205,168,104,.14)", border: "rgba(205,168,104,.3)",  text: "var(--gold)" },
                  Mindconsulting:  { bg: "rgba(110,167,164,.14)", border: "rgba(110,167,164,.3)",  text: "var(--teal)" },
                  "Call-Agent":    { bg: "rgba(115,181,141,.14)", border: "rgba(115,181,141,.3)",  text: "var(--success)" },
                };
                const c = colors[b];
                return (
                  <button
                    key={b}
                    onClick={() => toggleSector(b)}
                    style={{
                      padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 500,
                      cursor: "pointer", transition: "all .15s",
                      background: active ? c.bg : "rgba(255,255,255,.04)",
                      border: `1px solid ${active ? c.border : "rgba(255,255,255,.08)"}`,
                      color: active ? c.text : "var(--muted-text)",
                    }}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 8 }}>
              Nichts gewählt = alle Bereiche werden exportiert.
            </p>
          </div>

          {/* Preview summary */}
          <div style={{
            padding: "12px 14px", borderRadius: 14,
            background: "rgba(205,168,104,.06)", border: "1px solid rgba(205,168,104,.12)",
            fontSize: 12, color: "var(--muted-text)", lineHeight: 1.6,
          }}>
            <span style={{ color: "var(--gold)", fontWeight: 600 }}>Inhalt des PDFs:</span>{" "}
            {[
              "KPI-Zusammenfassung",
              "Marken-Blick (Netto pro Bereich)",
              "Detailtabelle aller Einträge",
              "Summenzeile",
            ].join(" · ")}
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 12,
              background: "rgba(196,116,116,.1)", border: "1px solid rgba(196,116,116,.22)",
              color: "var(--danger)", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={loading}
              style={{
                flex: 1, minHeight: 50, borderRadius: 16,
                border: "1px solid rgba(205,168,104,.32)",
                background: "linear-gradient(135deg, rgba(205,168,104,.22), rgba(205,168,104,.10))",
                color: "var(--gold)", fontSize: 14, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? .6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  PDF wird erstellt…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  PDF herunterladen
                </>
              )}
            </button>
            <button
              onClick={onClose}
              style={{
                minWidth: 80, minHeight: 50, borderRadius: 16,
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(255,255,255,.03)",
                color: "var(--muted-text)", fontSize: 14, cursor: "pointer",
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
