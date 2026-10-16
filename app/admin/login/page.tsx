import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Entrar · Rocha Academy" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4 py-12">
      <LoginForm />
    </main>
  );
}
