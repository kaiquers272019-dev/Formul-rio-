"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-6 py-12 text-paper">
      <div className="w-full max-w-md">
        <p className="font-display text-sm uppercase tracking-[0.2em] text-red-bright">Rocha Academy</p>
        <h1 className="mt-3 font-display text-4xl uppercase leading-none">Algo deu errado</h1>
        <p className="mt-4 text-base text-muted-dark">
          Não conseguimos carregar esta página. Tente novamente em instantes.
        </p>
        <p className="mt-3 text-sm text-muted-dark">
          Se você administra o sistema: confira se a variável <code className="text-paper">DATABASE_URL</code>{" "}
          aponta para um Postgres acessível e se as migrations foram aplicadas (
          <code className="text-paper">npx prisma migrate deploy</code>).
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-8 w-full bg-red px-6 py-4 font-display text-lg uppercase tracking-wide text-paper transition hover:bg-red-hover active:translate-y-px"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
