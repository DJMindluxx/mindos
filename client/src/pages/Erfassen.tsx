import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { InsertEntry, Settings } from "@shared/schema";
import AppHeader from "@/components/shared/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { today } from "@/lib/finance";

interface ErfassenProps {
  onSuccess: () => void;
}

const BUSINESSES = ["Mindsound", "Mindconsulting", "Call-Agent"] as const;
const STATUSES = [
  { value: "bezahlt", label: "Bezahlt" },
  { value: "offen", label: "Offen" },
  { value: "erwartet", label: "Erwartet" },
] as const;

export default function Erfassen({ onSuccess }: ErfassenProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: () => apiRequest("GET", "/api/settings").then(r => r.json()),
  });

  const [form, setForm] = useState({
    date: today(),
    business: "Mindsound" as string,
    status: "bezahlt" as string,
    entryType: "money" as "money" | "minutes",
    gross: "",
    minutes: "",
    minuteRate: "0.10",
    inps: "25",
    tax: "15",
    note: "",
  });

  // Sync defaults from settings
  useEffect(() => {
    if (settings) {
      setForm((f) => ({
        ...f,
        minuteRate: settings.defaultMinuteRate.toFixed(4),
        inps: settings.defaultInps.toString(),
        tax: settings.defaultTax.toString(),
      }));
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: Partial<InsertEntry>) =>
      apiRequest("POST", "/api/entries", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({ title: "Eintrag gespeichert", description: "Die Bewegung wurde erfolgreich erfasst." });
      resetForm();
      onSuccess();
    },
    onError: () => {
      toast({ title: "Fehler", description: "Eintrag konnte nicht gespeichert werden.", variant: "destructive" });
    },
  });

  function resetForm() {
    setForm({
      date: today(),
      business: "Mindsound",
      status: "bezahlt",
      entryType: "money",
      gross: "",
      minutes: "",
      minuteRate: settings?.defaultMinuteRate.toFixed(4) ?? "0.10",
      inps: settings?.defaultInps.toString() ?? "25",
      tax: settings?.defaultTax.toString() ?? "15",
      note: "",
    });
  }

  function handleDemoFill() {
    setForm({
      date: today(),
      business: "Mindsound",
      status: "bezahlt",
      entryType: "money",
      gross: "350",
      minutes: "",
      minuteRate: "0.10",
      inps: "25",
      tax: "15",
      note: "Demo-Gig · Club Lecce",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Partial<InsertEntry> = {
      date: form.date,
      business: form.business,
      status: form.status,
      entryType: form.entryType,
      gross: form.entryType === "money" ? parseFloat(form.gross) || 0 : 0,
      minutes: form.entryType === "minutes" ? parseFloat(form.minutes) || 0 : 0,
      minuteRate: parseFloat(form.minuteRate) || 0.1,
      inps: parseFloat(form.inps) || 25,
      tax: parseFloat(form.tax) || 15,
      note: form.note,
      net: 0,
    };
    mutation.mutate(payload);
  }

  const fieldStyle = {
    minHeight: 50,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.03)",
    padding: "0 14px",
    color: "var(--text)",
    fontSize: 15,
    width: "100%",
    outline: "none",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: "border-color .15s, box-shadow .15s",
  };

  const labelStyle = {
    fontSize: 10,
    letterSpacing: ".2em",
    textTransform: "uppercase" as const,
    color: "var(--faint)",
    marginBottom: 7,
    display: "block",
  };

  // Live preview
  const gross = parseFloat(form.gross) || 0;
  const mins = parseFloat(form.minutes) || 0;
  const rate = parseFloat(form.minuteRate) || 0.1;
  const inps = parseFloat(form.inps) || 25;
  const tax = parseFloat(form.tax) || 15;
  const effectiveGross = form.entryType === "minutes" ? mins * rate : gross;
  const net = effectiveGross * (1 - (inps + tax) / 100);

  return (
    <div className="view-content">
      <AppHeader
        eyebrow="Neue Bewegung"
        title="Erfassen"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        }
      />

      <div className="glass-panel p-5">
        <form onSubmit={handleSubmit} data-testid="entry-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Datum */}
            <div>
              <label style={labelStyle}>Datum</label>
              <input
                type="date"
                data-testid="input-date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                style={fieldStyle}
              />
            </div>

            {/* Bereich */}
            <div>
              <label style={labelStyle}>Bereich</label>
              <select
                data-testid="select-business"
                value={form.business}
                onChange={(e) => setForm((f) => ({ ...f, business: e.target.value }))}
                style={{
                  ...fieldStyle,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23cda868' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                  backgroundSize: "16px",
                  paddingRight: 42,
                  backgroundColor: "#1a1520",
                  appearance: "none",
                }}
              >
                {BUSINESSES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <select
                data-testid="select-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                style={{
                  ...fieldStyle,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23cda868' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                  backgroundSize: "16px",
                  paddingRight: 42,
                  backgroundColor: "#1a1520",
                  appearance: "none",
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Eingabeart */}
            <div>
              <label style={labelStyle}>Eingabeart</label>
              <select
                data-testid="select-entry-type"
                value={form.entryType}
                onChange={(e) => setForm((f) => ({ ...f, entryType: e.target.value as any }))}
                style={{
                  ...fieldStyle,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23cda868' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                  backgroundSize: "16px",
                  paddingRight: 42,
                  backgroundColor: "#1a1520",
                  appearance: "none",
                }}
              >
                <option value="money">Direkter Betrag</option>
                <option value="minutes">Minuten abrechnen</option>
              </select>
            </div>

            {/* Betrag oder Minuten */}
            {form.entryType === "money" ? (
              <div>
                <label style={labelStyle}>Betrag brutto (€)</label>
                <input
                  type="number"
                  data-testid="input-gross"
                  min={0}
                  step="0.01"
                  placeholder="z. B. 350"
                  value={form.gross}
                  onChange={(e) => setForm((f) => ({ ...f, gross: e.target.value }))}
                  style={fieldStyle}
                />
              </div>
            ) : (
              <>
                <div>
                  <label style={labelStyle}>Minuten</label>
                  <input
                    type="number"
                    data-testid="input-minutes"
                    min={0}
                    step={1}
                    placeholder="z. B. 185"
                    value={form.minutes}
                    onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>€ pro Minute</label>
                  <input
                    type="number"
                    data-testid="input-minute-rate"
                    min={0}
                    step="0.0001"
                    value={form.minuteRate}
                    onChange={(e) => setForm((f) => ({ ...f, minuteRate: e.target.value }))}
                    style={fieldStyle}
                  />
                </div>
              </>
            )}

            {/* INPS */}
            <div>
              <label style={labelStyle}>INPS %</label>
              <input
                type="number"
                data-testid="input-inps"
                min={0}
                max={100}
                step="0.1"
                value={form.inps}
                onChange={(e) => setForm((f) => ({ ...f, inps: e.target.value }))}
                style={fieldStyle}
              />
            </div>

            {/* Steuer */}
            <div>
              <label style={labelStyle}>Steuer %</label>
              <input
                type="number"
                data-testid="input-tax"
                min={0}
                max={100}
                step="0.1"
                value={form.tax}
                onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))}
                style={fieldStyle}
              />
            </div>

            {/* Notiz */}
            <div className="sm:col-span-2">
              <label style={labelStyle}>Notiz</label>
              <textarea
                data-testid="input-note"
                placeholder="Kunde, Event, Beratung, Schicht…"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                style={{
                  ...fieldStyle,
                  minHeight: 90,
                  padding: 14,
                  lineHeight: 1.5,
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          {/* Live Preview */}
          {effectiveGross > 0 && (
            <div
              className="mt-4 p-4"
              style={{
                background: "rgba(205,168,104,.07)",
                border: "1px solid rgba(205,168,104,.16)",
                borderRadius: 14,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--faint)" }}>Brutto</div>
                <div className="tabular" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.03em" }}>
                  {new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(effectiveGross)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--faint)" }}>Netto (nach Abzug)</div>
                <div className="tabular" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.03em", color: "var(--gold)" }}>
                  {new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(net)}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-5 flex-wrap">
            <button
              type="submit"
              data-testid="button-submit"
              disabled={mutation.isPending}
              style={{
                minHeight: 46,
                padding: "0 22px",
                borderRadius: 14,
                border: "1px solid rgba(205,168,104,.3)",
                background: "linear-gradient(135deg, rgba(205,168,104,.22), rgba(205,168,104,.10))",
                color: "var(--gold)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: mutation.isPending ? .6 : 1,
              }}
            >
              {mutation.isPending ? "Speichern…" : "Eintrag hinzufügen"}
            </button>
            <button
              type="button"
              data-testid="button-demo"
              onClick={handleDemoFill}
              style={{
                minHeight: 46,
                padding: "0 18px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(255,255,255,.03)",
                color: "var(--muted-text)",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Demo-Daten
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
