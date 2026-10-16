"use client";

import { createContext, useContext } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeStats } from "@/lib/analytics";
import { formatDuration, pct } from "@/lib/analytics";
import { NODE_TYPE_LABEL, type FlowNodeType } from "@/lib/flow";
import type { EditorNode } from "./editor-types";

export const StatsContext = createContext<Record<string, NodeStats>>({});

function StatsLine({ id, final }: { id: string; final: boolean }) {
  const s = useContext(StatsContext)[id];
  if (!s?.reached) return <p className="mt-3 border-t border-line pt-2 text-[11px] text-muted">sem dados ainda</p>;
  const leads = `${s.reached} ${s.reached === 1 ? "lead" : "leads"}`;
  if (final) {
    return (
      <p className="mt-3 border-t border-line pt-2 text-[11px] font-semibold" title="Leads que terminaram aqui">
        {leads} concluíram aqui
      </p>
    );
  }
  return (
    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-line pt-2 text-[11px] font-semibold">
      <span title="Leads que passaram">{leads}</span>
      <span title="Conversão (avançaram)">↗ {pct(s.conversion)}</span>
      <span title="Abandono (pararam aqui)" className={s.abandonment > 0 ? "text-red" : undefined}>
        ↘ {pct(s.abandonment)}
      </span>
      <span title="Tempo médio na etapa">⏱ {formatDuration(s.avgTimeMs)}</span>
    </p>
  );
}

function Shell({
  type,
  selected,
  badge,
  heavy = false,
  children,
  id,
}: {
  type: FlowNodeType;
  selected: boolean;
  badge?: React.ReactNode;
  heavy?: boolean;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <div
      className={`w-[260px] bg-paper px-4 py-3 text-ink shadow-[4px_4px_0_0_rgba(11,11,11,0.12)] transition ${
        selected ? "border-[3px] border-red" : heavy ? "border-[3px] border-ink" : "border-2 border-ink"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-paper">
          {NODE_TYPE_LABEL[type]}
        </span>
        {badge}
      </div>
      {children}
      <StatsLine id={id} final={type === "outcome"} />
    </div>
  );
}

const title = "mt-2 line-clamp-2 text-sm font-bold leading-snug";
const preview = "mt-1 line-clamp-2 text-xs text-muted";
const handleTarget = <Handle type="target" position={Position.Left} />;
const handleSource = <Handle type="source" position={Position.Right} />;

export function IntroNodeView({ id, data, selected }: NodeProps<Extract<EditorNode, { type: "intro" }>>) {
  return (
    <>
      <Shell id={id} type="intro" selected={selected} heavy badge={<span className="text-[10px] font-bold uppercase">Início</span>}>
        <p className={title}>{data.title || "Sem título"}</p>
        <p className={preview}>{data.body}</p>
      </Shell>
      {handleSource}
    </>
  );
}

export function ContactNodeView({ id, data, selected }: NodeProps<Extract<EditorNode, { type: "contact" }>>) {
  return (
    <>
      {handleTarget}
      <Shell id={id} type="contact" selected={selected}>
        <p className={title}>{data.question || "Sem pergunta"}</p>
        <p className={preview}>Campos: nome e WhatsApp</p>
      </Shell>
      {handleSource}
    </>
  );
}

export function ChoiceNodeView({ id, data, selected }: NodeProps<Extract<EditorNode, { type: "choice" }>>) {
  return (
    <>
      {handleTarget}
      <Shell id={id} type="choice" selected={selected}>
        <p className={title}>{data.question || "Sem pergunta"}</p>
        <ul className="mt-2 flex flex-col gap-1">
          {data.options.map((o) => (
            <li key={o.id} className="flex items-start justify-between gap-2 border border-line px-2 py-1 text-xs">
              <span className="line-clamp-1">{o.label || "(sem texto)"}</span>
              {o.tags.length > 0 && (
                <span className="shrink-0 font-mono text-[10px] text-muted">{o.tags.join(", ")}</span>
              )}
            </li>
          ))}
        </ul>
      </Shell>
      {handleSource}
    </>
  );
}

export function OutcomeNodeView({ id, data, selected }: NodeProps<Extract<EditorNode, { type: "outcome" }>>) {
  return (
    <>
      {handleTarget}
      <Shell
        id={id}
        type="outcome"
        selected={selected}
        badge={
          data.qualified ? (
            <span className="bg-red px-1.5 py-0.5 text-[10px] font-bold uppercase text-paper">✓ Qualificado</span>
          ) : (
            <span className="border border-ink px-1.5 py-0.5 text-[10px] font-bold uppercase">Não qualificado</span>
          )
        }
      >
        <p className={title}>{data.title || "Sem título"}</p>
        <p className={preview}>{data.body}</p>
      </Shell>
    </>
  );
}

export const nodeTypes = {
  intro: IntroNodeView,
  contact: ContactNodeView,
  choice: ChoiceNodeView,
  outcome: OutcomeNodeView,
};
