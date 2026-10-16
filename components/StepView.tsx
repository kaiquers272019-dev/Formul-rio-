"use client";

import { useId, useState } from "react";
import type { FlowNode } from "@/lib/flow";
import { formatPhoneInput, phoneDigits } from "@/lib/phone";

type Props = {
  node: FlowNode;
  /** Número da pergunta exibida (contato e perguntas contam). */
  questionNumber: number;
  busy: boolean;
  /** Opção que está sendo enviada (para mostrar "Enviando..." no botão certo). */
  busyOptionId?: string | null;
  error?: string | null;
  initialName?: string;
  initialPhone?: string;
  onStart: () => void;
  onContact: (name: string, phone: string) => void;
  onChoose: (optionId: string) => void;
  /** Conteúdo extra no fim (ex.: "Recomeçar simulação"). */
  footer?: React.ReactNode;
};

const primaryBtn =
  "flex w-full items-center justify-center gap-2 bg-red px-6 py-4 font-display text-xl uppercase tracking-wide text-paper transition hover:bg-red-hover active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-3 disabled:text-muted-dark";

export function StepView(props: Props) {
  const { node, questionNumber, busy, error, footer } = props;
  // Hooks sempre no topo, antes de qualquer return condicional.
  const nameId = useId();
  const phoneId = useId();
  const [name, setName] = useState(props.initialName ?? "");
  const [phone, setPhone] = useState(props.initialPhone ?? "");

  const errorBox = error ? (
    <p role="alert" className="mt-4 border-l-4 border-red-bright bg-ink-2 px-4 py-3 text-sm text-paper">
      {error}
    </p>
  ) : null;

  const counter = (
    <p className="font-display text-sm uppercase tracking-[0.25em] text-red-bright">Pergunta {questionNumber}</p>
  );

  if (node.type === "intro") {
    return (
      <section>
        <h1 className="font-display text-5xl uppercase leading-[0.95] text-paper sm:text-6xl">{node.data.title}</h1>
        <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-muted-dark">{node.data.body}</p>
        <button type="button" className={`${primaryBtn} mt-10`} disabled={busy} onClick={props.onStart}>
          {busy && <span className="spinner" aria-hidden />}
          {busy ? "Enviando..." : "Começar"}
        </button>
        {errorBox}
        {footer}
      </section>
    );
  }

  if (node.type === "contact") {
    const ready = name.trim().length > 0 && phoneDigits(phone).length >= 10;
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) props.onContact(name.trim(), phone.trim());
        }}
      >
        {counter}
        <h1 className="mt-3 font-display text-4xl uppercase leading-[0.95] text-paper sm:text-5xl">
          {node.data.question}
        </h1>
        {node.data.help && <p className="mt-3 text-base text-muted-dark">{node.data.help}</p>}
        <label htmlFor={nameId} className="mt-8 block text-sm font-semibold text-paper">
          Nome
        </label>
        <input
          id={nameId}
          autoComplete="name"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full border-2 border-ink-3 bg-ink-2 px-4 py-4 text-lg text-paper outline-none transition placeholder:text-muted-dark focus:border-red-bright"
          placeholder="Seu nome"
        />
        <label htmlFor={phoneId} className="mt-5 block text-sm font-semibold text-paper">
          WhatsApp (com DDD)
        </label>
        <input
          id={phoneId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={phone}
          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          className="mt-2 w-full border-2 border-ink-3 bg-ink-2 px-4 py-4 text-lg text-paper outline-none transition placeholder:text-muted-dark focus:border-red-bright"
          placeholder="(11) 91234-5678"
        />
        <button type="submit" className={`${primaryBtn} mt-8`} disabled={!ready || busy}>
          {busy && <span className="spinner" aria-hidden />}
          {busy ? "Enviando..." : "Continuar"}
        </button>
        {errorBox}
        {footer}
      </form>
    );
  }

  if (node.type === "choice") {
    return (
      <section>
        {counter}
        <h1 className="mt-3 font-display text-4xl uppercase leading-[0.95] text-paper sm:text-5xl">
          {node.data.question}
        </h1>
        <ul className="mt-8 flex flex-col gap-3">
          {node.data.options.map((o) => {
            const sending = busy && props.busyOptionId === o.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => props.onChoose(o.id)}
                  className="group flex w-full items-center justify-between gap-4 border-2 border-ink-3 bg-ink-2 px-5 py-5 text-left text-lg font-semibold text-paper transition hover:border-red-bright hover:bg-ink-3 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{sending ? "Enviando..." : o.label}</span>
                  {sending ? (
                    <span className="spinner text-red-bright" aria-hidden />
                  ) : (
                    <span aria-hidden className="font-display text-2xl text-red-bright transition group-hover:translate-x-1">
                      →
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {errorBox}
        {footer}
      </section>
    );
  }

  return (
    <section>
      <div aria-hidden className="mb-8 h-2 w-16 bg-red" />
      <h1 className="font-display text-5xl uppercase leading-[0.95] text-paper sm:text-6xl">{node.data.title}</h1>
      <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-muted-dark">{node.data.body}</p>
      {footer}
    </section>
  );
}
