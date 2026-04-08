import type { Entry, Settings } from "@shared/schema";

// ── FORMATTERS ────────────────────────────────────────────────────────────────
export function fmt(n: number): string {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);
}

export function fmtMin(n: number): string {
  return `${Math.round(n)} Min`;
}

export function fmtHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)} h`;
}

// ── DATE HELPERS ──────────────────────────────────────────────────────────────
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

// ── COMPUTED STATS ─────────────────────────────────────────────────────────────
export interface Stats {
  netMonth: number;
  grossMonth: number;
  reserveMonth: number;
  todayNet: number;
  openGross: number;
  expectedGross: number;
  mindsoundNet: number;
  mindconsultingNet: number;
  callAgentNet: number;
  callMinutesMonth: number;
  callMinutesToday: number;
  callGrossMonth: number;
  avgMinuteRate: number;
}

export function computeStats(entries: Entry[]): Stats {
  const monthStr = currentMonth();
  const todayStr = today();

  const monthEntries = entries.filter((e) => e.date.startsWith(monthStr));
  const paid = monthEntries.filter((e) => e.status === "bezahlt");
  const open = monthEntries.filter((e) => e.status === "offen");
  const expected = monthEntries.filter((e) => e.status === "erwartet");
  const todayEntries = entries.filter((e) => e.date === todayStr && e.status === "bezahlt");

  const sumNet = (arr: Entry[]) => arr.reduce((s, e) => s + e.net, 0);
  const sumGross = (arr: Entry[]) => arr.reduce((s, e) => s + e.gross, 0);

  const netMonth = sumNet(paid);
  const grossMonth = sumGross(paid);
  const reserveMonth = grossMonth - netMonth;
  const todayNet = sumNet(todayEntries);

  const callPaid = paid.filter((e) => e.business === "Call-Agent");
  const callTodayEntries = entries.filter((e) => e.date === todayStr && e.business === "Call-Agent" && e.status === "bezahlt");
  const callMinutesMonth = callPaid.reduce((s, e) => s + e.minutes, 0);
  const callMinutesToday = callTodayEntries.reduce((s, e) => s + e.minutes, 0);
  const callGrossMonth = sumGross(callPaid);

  const totalCallMinutes = monthEntries
    .filter((e) => e.business === "Call-Agent")
    .reduce((s, e) => s + e.minutes, 0);
  const avgMinuteRate = totalCallMinutes > 0
    ? monthEntries.filter((e) => e.business === "Call-Agent").reduce((s, e) => s + e.gross, 0) / totalCallMinutes
    : 0;

  return {
    netMonth,
    grossMonth,
    reserveMonth,
    todayNet,
    openGross: sumGross(open),
    expectedGross: sumGross(expected),
    mindsoundNet: sumNet(paid.filter((e) => e.business === "Mindsound")),
    mindconsultingNet: sumNet(paid.filter((e) => e.business === "Mindconsulting")),
    callAgentNet: sumNet(callPaid),
    callMinutesMonth,
    callMinutesToday,
    callGrossMonth,
    avgMinuteRate,
  };
}

// ── TIMELINE (für Chart) ──────────────────────────────────────────────────────
export function buildTimeline(entries: Entry[]): { label: string; value: number }[] {
  const monthStr = currentMonth();
  const paid = entries.filter((e) => e.date.startsWith(monthStr) && e.status === "bezahlt");

  const byDay: Record<string, number> = {};
  for (const e of paid) {
    byDay[e.date] = (byDay[e.date] ?? 0) + e.net;
  }

  // Build cumulative
  const days = Object.keys(byDay).sort();
  let cumulative = 0;
  return days.map((d) => {
    cumulative += byDay[d];
    return { label: d.slice(8), value: cumulative }; // day number
  });
}
