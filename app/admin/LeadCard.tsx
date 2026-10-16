"use client";

import { useState } from "react";
import { whatsappUrl } from "@/lib/phone";

export type LeadCardData = {
  id: string;
  number: number;
  name: string | null;
  phone: string | null;
  origin: string | null;
  hot: boolean;
  qualified: boolean;
  contacted: boolean;
  createdAt: string;
  answers: { question: string; answer: string }[];
};

export function LeadCard({ lead }: { lead: LeadCardData }) {
  const [contacted, setContacted] = useState(lead.contacted);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wa = lead.phone ? whatsappUrl(lead.phone) : null;

  async function toggleContacted() {
    const next = !contacted;
    setContacted(next); // otimista
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacted: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setContacted(!next); // rollback
      setError("Não foi possível salvar. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={`flex flex-col gap-4 border-2 bg-paper p-5 md:flex-row md:items-start md:justify-between ${
        lead.hot ? "border-red" : "border-line"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-lg text-muted">#{lead.number}</span>
          <h2 className="text-lg font-bold">{lead.name || "Sem nome"}</h2>
          {lead.hot ? (
            <span className="bg-red px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-paper">Hot</span>
          ) : (
            <span className="border border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wider">Frio</span>
          )}
          {lead.qualified && (
            <span className="bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-paper">
              ✓ Qualificado
            </span>
          )}
          {contacted && (
            <span className="border border-line px-2 py-0.5 text-xs font-semibold text-muted">Contatado</span>
          )}
        </div>
        <p className="mt-1 font-mono text-sm">{lead.phone || "Sem telefone"}</p>
        {(lead.answers.length > 0 || lead.origin) && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {lead.answers.map((a) => (
              <li key={a.question} className="bg-paper-2 px-2 py-1 text-xs">
                <span className="text-muted">{a.question.replace(/[?:]+\s*$/, "")}:</span> <span className="font-semibold">{a.answer}</span>
              </li>
            ))}
            {lead.origin && (
              <li className="border border-red px-2 py-1 text-xs font-semibold text-red">origem: {lead.origin}</li>
            )}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">{lead.createdAt}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 md:w-48">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-ink px-4 py-2.5 text-center text-sm font-semibold text-paper transition hover:bg-red"
          >
            WhatsApp
          </a>
        ) : (
          <span className="bg-line px-4 py-2.5 text-center text-sm font-semibold text-muted">Sem WhatsApp</span>
        )}
        <button
          type="button"
          onClick={toggleContacted}
          disabled={saving}
          aria-pressed={contacted}
          className={`flex items-center justify-center gap-2 border-2 px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
            contacted ? "border-ink bg-paper text-ink hover:bg-paper-2" : "border-ink text-ink hover:border-red hover:text-red"
          }`}
        >
          {saving && <span className="spinner" aria-hidden />}
          {contacted ? "✓ Contatado" : "Marcar contatado"}
        </button>
        {error && (
          <p role="alert" className="text-xs font-semibold text-red">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
