// Agregação de funil sobre Lead.visited (puro: recebe os leads já carregados).
import { type FlowGraph, nodeTitle, parseVisited } from "@/lib/flow";

export type NodeStats = {
  reached: number;
  /** Leads que saíram deste nó para outro / reached. */
  conversion: number;
  /** Participação de cada próximo nó entre os que avançaram. */
  next: Record<string, number>;
  /** Leads cujo último nó é este e não concluíram / reached. */
  abandonment: number;
  /** Tempo médio no nó (ms) ou null se ninguém saiu dele. */
  avgTimeMs: number | null;
};

export type FlowAnalytics = {
  total: number;
  started: number;
  completed: number;
  conversion: number;
  avgAbandonment: number;
  /** Tempo médio do início até concluir (ms). */
  avgCompletionMs: number | null;
  best: { nodeId: string; name: string; rate: number } | null;
  worst: { nodeId: string; name: string; rate: number } | null;
  nodes: Record<string, NodeStats>;
};

type LeadInput = { visited: unknown; completed: boolean };

export function computeAnalytics(graph: FlowGraph, leads: LeadInput[]): FlowAnalytics {
  const acc: Record<string, { reached: number; advanced: number; next: Record<string, number>; abandoned: number; time: number; timeN: number }> = {};
  const get = (id: string) => (acc[id] ??= { reached: 0, advanced: 0, next: {}, abandoned: 0, time: 0, timeN: 0 });

  let started = 0;
  let completed = 0;
  let completionTime = 0;
  let completionN = 0;

  for (const lead of leads) {
    const visits = parseVisited(lead.visited);
    if (!visits.length) continue; // leads anteriores ao log ficam fora
    started++;
    if (lead.completed) completed++;

    const seen = new Set<string>();
    const advancedFrom = new Set<string>();
    for (let i = 0; i < visits.length; i++) {
      const v = visits[i];
      const s = get(v.nodeId);
      if (!seen.has(v.nodeId)) {
        seen.add(v.nodeId);
        s.reached++;
      }
      const nxt = visits[i + 1];
      if (nxt && nxt.nodeId !== v.nodeId) {
        const dt = Date.parse(nxt.at) - Date.parse(v.at);
        if (Number.isFinite(dt) && dt >= 0) {
          s.time += dt;
          s.timeN++;
        }
        if (!advancedFrom.has(v.nodeId)) {
          advancedFrom.add(v.nodeId);
          s.advanced++;
          s.next[nxt.nodeId] = (s.next[nxt.nodeId] ?? 0) + 1;
        }
      }
    }
    const last = visits[visits.length - 1];
    if (!lead.completed) get(last.nodeId).abandoned++;
    if (lead.completed && visits.length > 1) {
      const dt = Date.parse(last.at) - Date.parse(visits[0].at);
      if (Number.isFinite(dt) && dt >= 0) {
        completionTime += dt;
        completionN++;
      }
    }
  }

  const nodes: Record<string, NodeStats> = {};
  for (const [id, s] of Object.entries(acc)) {
    const next: Record<string, number> = {};
    for (const [to, n] of Object.entries(s.next)) next[to] = s.advanced ? n / s.advanced : 0;
    nodes[id] = {
      reached: s.reached,
      conversion: s.reached ? s.advanced / s.reached : 0,
      next,
      abandonment: s.reached ? s.abandoned / s.reached : 0,
      avgTimeMs: s.timeN ? s.time / s.timeN : null,
    };
  }

  // Médias/extremos só sobre etapas que não são Fim e que alguém alcançou.
  const ranked = graph.nodes
    .filter((n) => n.type !== "outcome" && nodes[n.id]?.reached)
    .map((n) => ({ nodeId: n.id, name: nodeTitle(n) || n.id, s: nodes[n.id] }));
  const pick = (key: "conversion" | "abandonment") =>
    ranked.length
      ? ranked.reduce((a, b) => (b.s[key] > a.s[key] ? b : a))
      : null;
  const best = pick("conversion");
  const worst = pick("abandonment");

  return {
    total: leads.length,
    started,
    completed,
    conversion: started ? completed / started : 0,
    avgAbandonment: ranked.length ? ranked.reduce((sum, r) => sum + r.s.abandonment, 0) / ranked.length : 0,
    avgCompletionMs: completionN ? completionTime / completionN : null,
    best: best ? { nodeId: best.nodeId, name: best.name, rate: best.s.conversion } : null,
    worst: worst && worst.s.abandonment > 0 ? { nodeId: worst.nodeId, name: worst.name, rate: worst.s.abandonment } : null,
    nodes,
  };
}

export const PERIODS = {
  "7d": { label: "Últimos 7 dias", days: 7 },
  "30d": { label: "Últimos 30 dias", days: 30 },
  tudo: { label: "Todo o período", days: null },
} as const;
export type PeriodKey = keyof typeof PERIODS;

/** Data inicial do período (filtra por Lead.createdAt) ou null para todo o período. */
export function periodStart(key: PeriodKey, now: Date = new Date()): Date | null {
  const days = PERIODS[key].days;
  return days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;
}

export function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return "<1s";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

