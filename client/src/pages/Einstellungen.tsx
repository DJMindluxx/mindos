import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import type { Settings } from "@shared/schema";
import AppHeader from "@/components/shared/AppHeader";
import { useToast } from "@/hooks/use-toast";

export default function Einstellungen() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: () => apiRequest("GET", "/api/settings").then(r => r.json()),
  });

  const [form, setForm] = useState({
    monthlyGoal: "3000",
    defaultInps: "25",
    defaultTax: "15",
    defaultMinuteRate: "0.1000",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        monthlyGoal: settings.monthlyGoal.toFixed(2),
        defaultInps: settings.defaultInps.toString(),
        defaultTax: settings.defaultTax.toString(),
        defaultMinuteRate: settings.defaultMinuteRate.toFixed(4),
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Einstellungen gespeichert" });
    },
  });

  function save() {
    mutation.mutate({
      monthlyGoal: parseFloat(form.monthlyGoal) || 3000,
      defaultInps: parseFloat(form.defaultInps) || 25,
      defaultTax: parseFloat(form.defaultTax) || 15,
      defaultMinuteRate: parseFloat(form.defaultMinuteRate) || 0.1,
    });
  }

  const inputStyle = {
    minHeight: 36,
    width: 130,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.03)",
    padding: "0 12px",
    color: "var(--text)",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 14,
    outline: "none",
    textAlign: "right" as const,
    transition: "border-color .15s",
  };

  const sectionLabel = {
    fontSize: 10,
    letterSpacing: ".24em",
    textTransform: "uppercase" as const,
    color: "var(--faint)",
    marginBottom: 10,
    paddingLeft: 4,
  };

  const rowBase = {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: "15px 16px",
    background: "rgba(255,255,255,.025)",
    border: "1px solid rgba(255,255,255,.05)",
    fontSize: 14,
  };

  // Reserve preview
  const reservePct = (parseFloat(form.defaultInps) || 0) + (parseFloat(form.defaultTax) || 0);
  const netPct = 100 - reservePct;

  return (
    <div className="view-content">
      <AppHeader
        eyebrow="Konfiguration"
        title="Einstellungen"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0M20.49 9a10 10 0 0 0-8.56-4.94M3.51 9a10 10 0 0 0-.07 1M3.51 15a10 10 0 0 0 8.56 4.94M20.49 15a10 10 0 0 0 .07-1"/>
          </svg>
        }
      />

      <div className="flex flex-col gap-6">
        {/* FINANZZIELE */}
        <div>
          <div style={sectionLabel}>Finanzziele</div>
          <div style={{ ...rowBase, borderRadius: 18 }}>
            <span>Monatsziel (€ netto)</span>
            <input
              type="number"
              data-testid="input-monthly-goal"
              value={form.monthlyGoal}
              onChange={(e) => setForm((f) => ({ ...f, monthlyGoal: e.target.value }))}
              style={inputStyle}
              min={0}
              step={100}
            />
          </div>
        </div>

        {/* STANDARDWERTE */}
        <div>
          <div style={sectionLabel}>Standardwerte für neue Einträge</div>
          <div style={{ ...rowBase, borderRadius: "18px 18px 6px 6px" }}>
            <span>INPS %</span>
            <input
              type="number"
              data-testid="input-default-inps"
              value={form.defaultInps}
              onChange={(e) => setForm((f) => ({ ...f, defaultInps: e.target.value }))}
              style={inputStyle}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
          <div style={{ ...rowBase, borderTop: "none", borderRadius: "6px" }}>
            <span>Steuer %</span>
            <input
              type="number"
              data-testid="input-default-tax"
              value={form.defaultTax}
              onChange={(e) => setForm((f) => ({ ...f, defaultTax: e.target.value }))}
              style={inputStyle}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
          <div style={{ ...rowBase, borderTop: "none", borderRadius: "6px 6px 18px 18px" }}>
            <span>€ / Minute (Call-Agent)</span>
            <input
              type="number"
              data-testid="input-default-minute-rate"
              value={form.defaultMinuteRate}
              onChange={(e) => setForm((f) => ({ ...f, defaultMinuteRate: e.target.value }))}
              style={inputStyle}
              min={0}
              step={0.0001}
            />
          </div>
        </div>

        {/* LIVE PREVIEW */}
        <div
          className="p-4"
          style={{
            background: "rgba(205,168,104,.07)",
            border: "1px solid rgba(205,168,104,.16)",
            borderRadius: 16,
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 10 }}>
            Rücklage-Vorschau
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-text)" }}>Rücklage (INPS + Steuer)</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.04em", color: "var(--danger)", marginTop: 4 }}>
                {reservePct.toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-text)" }}>Auszahlung (Netto)</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.04em", color: "var(--gold)", marginTop: 4 }}>
                {netPct.toFixed(1)}%
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="progress-track">
              <div
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: `linear-gradient(90deg, var(--gold) ${netPct}%, var(--danger) ${netPct}%)`,
                  transition: "all .4s",
                  width: "100%",
                }}
              />
            </div>
          </div>
        </div>

        {/* ABOUT */}
        <div>
          <div style={sectionLabel}>System</div>
          <div
            style={{ ...rowBase, borderRadius: "18px 18px 6px 6px" }}
          >
            <span>Version</span>
            <span style={{ color: "var(--muted-text)" }}>1.0.0</span>
          </div>
          <div style={{ ...rowBase, borderTop: "none", borderRadius: "6px" }}>
            <span>Plattform</span>
            <span style={{ color: "var(--muted-text)" }}>Web PWA</span>
          </div>
          <div style={{ ...rowBase, borderTop: "none", borderRadius: "6px 6px 18px 18px" }}>
            <span>Speicherung</span>
            <span style={{ color: "var(--success)", fontWeight: 500 }}>Lokal · SQLite</span>
          </div>
        </div>

        {/* SAVE */}
        <button
          data-testid="button-save-settings"
          onClick={save}
          disabled={mutation.isPending}
          style={{
            minHeight: 50,
            padding: "0 22px",
            borderRadius: 16,
            border: "1px solid rgba(205,168,104,.3)",
            background: "linear-gradient(135deg, rgba(205,168,104,.22), rgba(205,168,104,.10))",
            color: "var(--gold)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            opacity: mutation.isPending ? .6 : 1,
            letterSpacing: ".04em",
          }}
        >
          {mutation.isPending ? "Speichern…" : "Einstellungen speichern"}
        </button>
      </div>
    </div>
  );
}
