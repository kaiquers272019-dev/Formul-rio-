"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 401) {
        setError("Senha incorreta.");
        return;
      }
      if (!res.ok) throw new Error();
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Não foi possível entrar. Verifique sua conexão e tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm border-t-4 border-red bg-paper p-8">
      <Brand />
      <h1 className="mt-6 font-display text-3xl uppercase leading-none">Painel admin</h1>
      <label htmlFor="password" className="mt-6 block text-sm font-semibold">
        Senha
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? "login-error" : undefined}
        className="mt-2 w-full border-2 border-ink bg-paper px-3 py-3 text-base outline-none focus:border-red"
      />
      {error && (
        <p id="login-error" role="alert" className="mt-2 text-sm font-semibold text-red">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending || !password}
        className="mt-6 flex w-full items-center justify-center gap-2 bg-ink px-4 py-3 font-semibold text-paper transition hover:bg-red disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {sending && <span className="spinner" aria-hidden />}
        {sending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
