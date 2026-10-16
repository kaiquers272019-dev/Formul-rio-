"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

type State = { q: string; qual: string; chamado: string; periodo: string };

const GROUPS: { key: keyof Omit<State, "q">; label: string; options: [string, string][] }[] = [
  { key: "qual", label: "Qualificação", options: [["", "Todos"], ["sim", "Qualificados"], ["nao", "Não qualificados"]] },
  { key: "chamado", label: "Contato", options: [["", "Todos"], ["sim", "Chamados"], ["nao", "Não chamados"]] },
  { key: "periodo", label: "Período", options: [["tudo", "Tudo"], ["hoje", "Hoje"], ["ontem", "Ontem"], ["7d", "7 dias"]] },
];

export function Filters({ initial }: { initial: State }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState(initial);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  function push(next: State) {
    const qs = new URLSearchParams();
    if (next.q.trim()) qs.set("q", next.q.trim());
    if (next.qual) qs.set("qual", next.qual);
    if (next.chamado) qs.set("chamado", next.chamado);
    if (next.periodo && next.periodo !== "tudo") qs.set("periodo", next.periodo);
    const s = qs.toString();
    startTransition(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  }

  // Busca de texto com debounce de ~350ms.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => push(state), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.q]);

  function setGroup(key: keyof Omit<State, "q">, value: string) {
    const next = { ...state, [key]: value };
    setState(next);
    push(next);
  }

  return (
    <section aria-label="Filtros" className="mt-8 border-2 border-ink bg-paper p-4">
      <div className="relative">
        <label htmlFor="busca" className="sr-only">
          Buscar por nome, telefone ou origem
        </label>
        <input
          id="busca"
          type="search"
          value={state.q}
          onChange={(e) => setState({ ...state, q: e.target.value })}
          placeholder="Buscar por nome, telefone ou origem"
          className="w-full border-2 border-line bg-paper px-4 py-3 pr-12 outline-none transition focus:border-red"
        />
        {pending && <span className="spinner absolute right-4 top-1/2 -mt-2 text-red" aria-label="Carregando" />}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        {GROUPS.map((g) => (
          <fieldset key={g.key} className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">{g.label}</legend>
            <span aria-hidden className="mr-1 text-xs font-bold uppercase tracking-[0.15em] text-muted">
              {g.label}
            </span>
            {g.options.map(([value, label]) => {
              const active = state[g.key] === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGroup(g.key, value)}
                  className={`border-2 px-3 py-1.5 text-sm font-semibold transition ${
                    active ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink hover:border-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </fieldset>
        ))}
      </div>
    </section>
  );
}
