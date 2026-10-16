import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { getPublishedGraph } from "@/lib/flow-db";
import { startOfDayBR, formatDateTimeBR } from "@/lib/dates";
import { Brand } from "@/components/Brand";
import { LogoutButton } from "./LogoutButton";
import { Filters } from "./Filters";
import { LeadCard, type LeadCardData } from "./LeadCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leads · Rocha Academy" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const qual = one(sp.qual);
  const chamado = one(sp.chamado);
  const periodo = one(sp.periodo) || "tudo";

  const today = startOfDayBR();
  const where: Prisma.LeadWhereInput = { completed: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { origin: { contains: q, mode: "insensitive" } },
    ];
  }
  if (qual === "sim") where.qualified = true;
  if (qual === "nao") where.NOT = { qualified: true };
  if (chamado === "sim") where.contacted = true;
  if (chamado === "nao") where.contacted = false;
  if (periodo === "hoje") where.createdAt = { gte: today };
  if (periodo === "ontem") where.createdAt = { gte: startOfDayBR(new Date(), -1), lt: today };
  if (periodo === "7d") where.createdAt = { gte: startOfDayBR(new Date(), -6) };

  const base = { completed: true };
  const [graph, total, hoje, hot, naoContatados, count, leads] = await Promise.all([
    getPublishedGraph(),
    prisma.lead.count({ where: base }),
    prisma.lead.count({ where: { ...base, createdAt: { gte: today } } }),
    prisma.lead.count({ where: { ...base, status: "hot" } }),
    prisma.lead.count({ where: { ...base, contacted: false } }),
    prisma.lead.count({ where }),
    prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  const choiceNodes = graph.nodes.filter((n) => n.type === "choice");
  const cards: LeadCardData[] = leads.map((l, i) => {
    const answers = (l.answers ?? {}) as Record<string, { label?: string }>;
    return {
      id: l.id,
      number: count - i,
      name: l.name,
      phone: l.phone,
      origin: l.origin,
      hot: l.status === "hot",
      qualified: l.qualified === true,
      contacted: l.contacted,
      createdAt: formatDateTimeBR(l.createdAt),
      answers: choiceNodes
        .filter((n) => answers[n.id]?.label)
        .map((n) => ({ question: n.data.question, answer: answers[n.id].label as string })),
    };
  });

  const hasFilters = Boolean(q || qual || chamado || periodo !== "tudo");

  return (
    <div className="min-h-dvh bg-paper-2">
      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/admin" aria-label="Leads">
            <Brand dark />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/admin/fluxo"
              className="border-2 border-paper px-4 py-2 text-sm font-semibold transition hover:border-red hover:bg-red"
            >
              Fluxo
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-display text-4xl uppercase leading-none">Leads</h1>

        <section aria-label="Resumo" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total" value={total} />
          <Stat label="Hoje" value={hoje} />
          <Stat label="Hot" value={hot} highlight />
          <Stat label="Não contatados" value={naoContatados} />
        </section>

        <Filters initial={{ q, qual, chamado, periodo }} />

        <p className="mt-6 text-sm font-semibold text-muted" aria-live="polite">
          {count} {count === 1 ? "resultado" : "resultados"}
          {count > 200 && " (mostrando os 200 mais recentes)"}
        </p>

        {cards.length ? (
          <ul className="mt-3 flex flex-col gap-3">
            {cards.map((c) => (
              <li key={c.id}>
                <LeadCard lead={c} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 border-2 border-dashed border-line bg-paper px-6 py-16 text-center">
            <p className="font-display text-2xl uppercase">
              {hasFilters ? "Nenhum lead com esses filtros" : "Nenhum lead ainda"}
            </p>
            <p className="mt-2 text-muted">
              {hasFilters
                ? "Tente limpar a busca ou escolher outro período."
                : "Assim que alguém concluir o formulário em /aplicacao, ele aparece aqui."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-5 ${highlight ? "bg-red text-paper" : "border-2 border-ink bg-paper"}`}>
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${highlight ? "text-paper" : "text-muted"}`}>
        {label}
      </p>
      <p className="mt-2 font-display text-5xl leading-none">{value}</p>
    </div>
  );
}
