import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Entry } from "@shared/schema";
import { fmt } from "@/lib/finance";
import AppHeader from "@/components/shared/AppHeader";
import ExportModal from "@/components/shared/ExportModal";
import { useToast } from "@/hooks/use-toast";

const BUSINESS_COLORS: Record<string, string> = {
  Mindsound: "var(--gold)",
  Mindconsulting: "var(--teal)",
  "Call-Agent": "var(--success)",
};

const BUSINESS_BG: Record<string, string> = {
  Mindsound: "rgba(205,168,104,.12)",
  Mindconsulting: "rgba(110,167,164,.12)",
  "Call-Agent": "rgba(115,181,141,.10)",
};

const BUSINESS_ICON: Record<string, string> = {
  Mindsound: "♪",
  Mindconsulting: "✦",
  "Call-Agent": "☎",
};

const STATUS_COLOR: Record<string, string> = {
  bezahlt: "var(--success)",
  offen: "var(--warning)",
  erwartet: "var(--teal)",
};

const STATUS_LABEL: Record<string, string> = {
  bezahlt: "Bezahlt",
  offen: "Offen",
  erwartet: "Erwartet",
};

export default function Eintraege() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [exportOpen, setExportOpen] = useState(false);

  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
    queryFn: () => apiRequest("GET", "/api/entries").then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/entries/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({ title: "Gelöscht", description: "Eintrag wurde entfernt." });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/entries"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({ title: "Alle Einträge gelöscht" });
    },
  });

  function handleClearAll() {
    if (window.confirm("Alle Einträge wirklich löschen?")) {
      clearMutation.mutate();
    }
  }

  return (
    <div className="view-content">
      <AppHeader
        eyebrow="Alle Bewegungen"
        title="Einträge"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        }
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              data-testid="button-export"
              onClick={() => setExportOpen(true)}
              style={{
                minHeight: 38, padding: "0 12px", borderRadius: 12,
                border: "1px solid rgba(205,168,104,.25)",
                background: "rgba(205,168,104,.09)",
                color: "var(--gold)", fontSize: 12, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              PDF
            </button>
            {entries.length > 0 && (
              <button
                data-testid="button-clear-all"
                onClick={handleClearAll}
                style={{
                  minHeight: 38, padding: "0 12px", borderRadius: 12,
                  border: "1px solid rgba(196,116,116,.22)",
                  background: "rgba(196,116,116,.08)",
                  color: "var(--danger)", fontSize: 12, fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Löschen
              </button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 72,
                borderRadius: 18,
                background: "linear-gradient(90deg, rgba(255,255,255,.03) 25%, rgba(255,255,255,.07) 50%, rgba(255,255,255,.03) 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center py-16" style={{ color: "var(--faint)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-4 opacity-30">
            <rect x="3" y="3" width="18" height="18" rx="4"/>
            <path d="M3 9h18"/>
          </svg>
          <p style={{ fontSize: 14 }}>Noch keine Einträge.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              data-testid={`entry-card-${entry.id}`}
              className="flex items-center gap-4 px-4 py-3"
              style={{
                background: "rgba(255,255,255,.025)",
                border: "1px solid rgba(255,255,255,.05)",
                borderRadius: 18,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  fontSize: 14,
                  background: BUSINESS_BG[entry.business] ?? "rgba(255,255,255,.05)",
                  color: BUSINESS_COLORS[entry.business] ?? "var(--text)",
                }}
              >
                {BUSINESS_ICON[entry.business] ?? "•"}
              </div>

              {/* Main */}
              <div className="flex-1 min-w-0">
                <div style={{ fontWeight: 500, fontSize: 14 }}>{entry.business}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{ color: STATUS_COLOR[entry.status], fontSize: 11, fontWeight: 600 }}>
                    {STATUS_LABEL[entry.status]}
                  </span>
                  <span style={{ color: "var(--faint)", fontSize: 11 }}>·</span>
                  <span style={{ color: "var(--muted-text)", fontSize: 11, whiteSpace: "nowrap" }}>{entry.date.slice(5).replace("-", "/")}</span>
                  {entry.note && (
                    <>
                      <span style={{ color: "var(--faint)", fontSize: 11 }}>·</span>
                      <span style={{ color: "var(--muted-text)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                        {entry.note}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Amounts */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="tabular" style={{ fontSize: 15, fontWeight: 600 }}>{fmt(entry.net)}</div>
                <div className="tabular" style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{fmt(entry.gross)} brutto</div>
              </div>

              {/* Delete */}
              <button
                data-testid={`button-delete-${entry.id}`}
                onClick={() => deleteMutation.mutate(entry.id)}
                style={{
                  color: "var(--faint)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 8,
                  flexShrink: 0,
                  transition: "color .15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "var(--danger)")}
                onMouseOut={(e) => (e.currentTarget.style.color = "var(--faint)")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
