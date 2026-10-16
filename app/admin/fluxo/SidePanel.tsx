"use client";

import { useId, useState } from "react";
import { NODE_TYPE_LABEL, type StepOption, edgeLabel, newId } from "@/lib/flow";
import type { EditorEdge, EditorNode } from "./editor-types";

const input =
  "mt-1 w-full border-2 border-line bg-paper px-3 py-2 text-sm outline-none transition focus:border-red";
const labelCls = "mt-4 block text-xs font-bold uppercase tracking-wider text-muted";
const dangerBtn =
  "mt-6 w-full border-2 border-red px-3 py-2 text-sm font-semibold text-red transition hover:bg-red hover:text-paper disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent";

const parseTags = (s: string) =>
  s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t, i, a) => a.indexOf(t) === i);

type NodePanelProps = {
  node: EditorNode;
  canDelete: boolean;
  deleteHint?: string;
  onChange: (data: EditorNode["data"]) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function NodePanel({ node, canDelete, deleteHint, onChange, onDelete, onClose }: NodePanelProps) {
  const uid = useId();
  // Texto cru das tags por opção (permite digitar vírgulas livremente).
  const [tagText, setTagText] = useState<Record<string, string>>(() =>
    node.type === "choice" ? Object.fromEntries(node.data.options.map((o) => [o.id, o.tags.join(", ")])) : {},
  );

  return (
    <PanelShell title={NODE_TYPE_LABEL[node.type]} subtitle={node.id} onClose={onClose}>
      {node.type === "intro" && (
        <>
          <label htmlFor={`${uid}-t`} className={labelCls}>Título</label>
          <input id={`${uid}-t`} className={input} value={node.data.title} onChange={(e) => onChange({ ...node.data, title: e.target.value })} />
          <label htmlFor={`${uid}-b`} className={labelCls}>Texto</label>
          <textarea id={`${uid}-b`} rows={5} className={input} value={node.data.body} onChange={(e) => onChange({ ...node.data, body: e.target.value })} />
        </>
      )}

      {node.type === "contact" && (
        <>
          <label htmlFor={`${uid}-q`} className={labelCls}>Pergunta</label>
          <input id={`${uid}-q`} className={input} value={node.data.question} onChange={(e) => onChange({ ...node.data, question: e.target.value })} />
          <label htmlFor={`${uid}-h`} className={labelCls}>Texto de apoio</label>
          <textarea id={`${uid}-h`} rows={3} className={input} value={node.data.help} onChange={(e) => onChange({ ...node.data, help: e.target.value })} />
          <p className="mt-3 text-xs text-muted">Os campos Nome e WhatsApp são fixos.</p>
        </>
      )}

      {node.type === "outcome" && (
        <>
          <label htmlFor={`${uid}-t`} className={labelCls}>Título</label>
          <input id={`${uid}-t`} className={input} value={node.data.title} onChange={(e) => onChange({ ...node.data, title: e.target.value })} />
          <label htmlFor={`${uid}-b`} className={labelCls}>Texto</label>
          <textarea id={`${uid}-b`} rows={5} className={input} value={node.data.body} onChange={(e) => onChange({ ...node.data, body: e.target.value })} />
          <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--red)]"
              checked={node.data.qualified}
              onChange={(e) => onChange({ ...node.data, qualified: e.target.checked })}
            />
            Marca o lead como qualificado (hot)
          </label>
        </>
      )}

      {node.type === "choice" && (
        <>
          <label htmlFor={`${uid}-q`} className={labelCls}>Pergunta</label>
          <input id={`${uid}-q`} className={input} value={node.data.question} onChange={(e) => onChange({ ...node.data, question: e.target.value })} />
          <p className={labelCls}>Opções</p>
          <ul className="mt-1 flex flex-col gap-3">
            {node.data.options.map((o, i) => {
              const update = (patch: Partial<StepOption>) =>
                onChange({ ...node.data, options: node.data.options.map((x) => (x.id === o.id ? { ...x, ...patch } : x)) });
              return (
                <li key={o.id} className="border-2 border-line p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Opção {i + 1}</span>
                    <button
                      type="button"
                      disabled={node.data.options.length <= 1}
                      onClick={() => onChange({ ...node.data, options: node.data.options.filter((x) => x.id !== o.id) })}
                      className="text-xs font-semibold text-red hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
                      title={node.data.options.length <= 1 ? "A pergunta precisa de ao menos 1 opção" : undefined}
                    >
                      Remover
                    </button>
                  </div>
                  <label htmlFor={`${uid}-${o.id}-l`} className="sr-only">Rótulo da opção {i + 1}</label>
                  <input
                    id={`${uid}-${o.id}-l`}
                    className={input}
                    placeholder="Rótulo"
                    value={o.label}
                    onChange={(e) => update({ label: e.target.value })}
                  />
                  <label htmlFor={`${uid}-${o.id}-t`} className="mt-2 block text-[11px] text-muted">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    id={`${uid}-${o.id}-t`}
                    className={`${input} font-mono`}
                    placeholder="ex.: cliente, qualificado"
                    value={tagText[o.id] ?? o.tags.join(", ")}
                    onChange={(e) => {
                      setTagText((s) => ({ ...s, [o.id]: e.target.value }));
                      update({ tags: parseTags(e.target.value) });
                    }}
                  />
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() =>
              onChange({ ...node.data, options: [...node.data.options, { id: newId("o"), label: "Nova opção", tags: [] }] })
            }
            className="mt-3 w-full border-2 border-dashed border-ink px-3 py-2 text-sm font-semibold transition hover:border-red hover:text-red"
          >
            + Adicionar opção
          </button>
        </>
      )}

      {(node.type === "choice" || node.type === "outcome") && (
        <>
          <button type="button" className={dangerBtn} disabled={!canDelete} onClick={onDelete}>
            Excluir etapa
          </button>
          {!canDelete && deleteHint && <p className="mt-2 text-xs text-muted">{deleteHint}</p>}
        </>
      )}
      {(node.type === "intro" || node.type === "contact") && (
        <p className="mt-6 text-xs text-muted">Esta etapa é única no fluxo e não pode ser excluída.</p>
      )}
    </PanelShell>
  );
}

type EdgePanelProps = {
  edge: EditorEdge;
  fromName: string;
  toName: string;
  tags: string[];
  order: number;
  siblings: number;
  onToggleTag: (tag: string) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function EdgePanel(p: EdgePanelProps) {
  const required = p.edge.data?.requiredTags ?? [];
  return (
    <PanelShell title="Conexão" subtitle={`${p.fromName} → ${p.toName}`} onClose={p.onClose}>
      <p className={labelCls}>Condição</p>
      <p className="mt-1 font-mono text-sm font-semibold">{edgeLabel(required)}</p>
      <p className="mt-1 text-xs text-muted">
        Esta seta vale quando o lead tem <strong>todas</strong> as tags marcadas. Sem tags = sempre.
      </p>

      <p className={labelCls}>Tags exigidas</p>
      {p.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {p.tags.map((t) => {
            const on = required.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => p.onToggleTag(t)}
                className={`border-2 px-2 py-1 font-mono text-xs font-semibold transition ${
                  on ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"
                }`}
              >
                {on ? "✓ " : "+ "}
                {t}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">Nenhuma tag existe ainda. Adicione tags nas opções das perguntas.</p>
      )}

      {p.siblings > 1 && (
        <>
          <p className={labelCls}>Prioridade</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-semibold">
              {p.order} de {p.siblings}
            </span>
            <button
              type="button"
              disabled={p.order <= 1}
              onClick={() => p.onMove(-1)}
              className="border-2 border-ink px-2 py-0.5 text-sm font-semibold hover:border-red hover:text-red disabled:cursor-not-allowed disabled:border-line disabled:text-muted"
              aria-label="Subir prioridade"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={p.order >= p.siblings}
              onClick={() => p.onMove(1)}
              className="border-2 border-ink px-2 py-0.5 text-sm font-semibold hover:border-red hover:text-red disabled:cursor-not-allowed disabled:border-line disabled:text-muted"
              aria-label="Descer prioridade"
            >
              ↓
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            Vale a primeira seta que bater; se nenhuma bater, vale a última ({p.siblings}.) como padrão.
          </p>
        </>
      )}

      <button type="button" className={dangerBtn} onClick={p.onDelete}>
        Excluir conexão
      </button>
    </PanelShell>
  );
}

function PanelShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l-2 border-ink bg-paper">
      <div className="flex items-start justify-between gap-2 border-b-2 border-ink bg-ink px-4 py-3 text-paper">
        <div className="min-w-0">
          <h2 className="font-display text-xl uppercase leading-none">{title}</h2>
          {subtitle && <p className="mt-1 truncate font-mono text-[11px] text-muted-dark">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-2 text-xl leading-none text-muted-dark transition hover:text-paper"
          aria-label="Fechar painel"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">{children}</div>
    </aside>
  );
}
