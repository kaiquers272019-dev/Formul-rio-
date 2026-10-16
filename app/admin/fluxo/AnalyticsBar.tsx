"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PERIODS, type FlowAnalytics, type PeriodKey, formatDuration, pct } from "@/lib/analytics";

export function AnalyticsBar({ analytics: a, period }: { analytics: FlowAnalytics; period: PeriodKey }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const items: { label: string; value: string; hint?: string; accent?: boolean }[] = [
    { label: "Total de leads", value: String(a.total) },
    { label: "Iniciados", value: String(a.started) },
    { label: "Concluídos", value: String(a.completed) },
    { label: "Conversão total", value: a.started ? pct(a.conversion) : "—", accent: true },
    { label: "Abandono médio", value: a.started ? pct(a.avgAbandonment) : "—" },
    { label: "Tempo médio", value: formatDuration(a.avgCompletionMs), hint: "até concluir" },
    { label: "Maior conversão", value: a.best ? pct(a.best.rate) : "—", hint: a.best?.name },
    { label: "Maior abandono", value: a.worst ? pct(a.worst.rate) : "—", hint: a.worst?.name },
  ];

  return (
    <section aria-label="Analytics do funil" className="border-b-2 border-ink bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
        <h2 className="font-display text-lg uppercase tracking-wide">Funil</h2>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
            <Link
              key={k}
              href={`/admin/fluxo?periodo=${k}`}
              aria-current={k === period ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                startTransition(() => router.replace(`/admin/fluxo?periodo=${k}`, { scroll: false }));
              }}
              className={`border-2 px-3 py-1 text-xs font-semibold transition ${
                k === period ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
              }`}
            >
              {PERIODS[k].label}
            </Link>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
            className="flex items-center gap-2 border-2 border-ink px-3 py-1 text-xs font-semibold transition hover:border-red hover:text-red disabled:cursor-wait disabled:opacity-60"
          >
            {pending && <span className="spinner" aria-hidden />}
            {pending ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>
      <dl className={`grid grid-cols-2 gap-px p-4 sm:grid-cols-4 xl:grid-cols-8 ${pending ? "opacity-60" : ""}`}>
        {items.map((it) => (
          <div key={it.label} className={`min-w-0 px-3 py-2 ${it.accent ? "bg-red text-paper" : "bg-paper-2"}`}>
            <dt className={`text-[11px] font-bold uppercase tracking-wider ${it.accent ? "text-paper" : "text-muted"}`}>
              {it.label}
            </dt>
            <dd className="font-display text-2xl leading-tight">{it.value}</dd>
            {it.hint && (
              <dd className={`truncate text-xs ${it.accent ? "text-paper" : "text-muted"}`} title={it.hint}>
                {it.hint}
              </dd>
            )}
          </div>
        ))}
      </dl>
      {a.total > 0 && a.started < a.total && (
        <p className="px-4 pb-3 text-xs text-muted">
          {a.total - a.started} lead(s) anteriores ao registro de etapas ficam fora destes números.
        </p>
      )}
    </section>
  );
}
