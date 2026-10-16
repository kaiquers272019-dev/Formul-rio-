"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth", { method: "DELETE" });
          router.replace("/admin/login");
          router.refresh();
        } catch {
          setBusy(false);
        }
      }}
      className="px-4 py-2 text-sm font-semibold text-muted-dark transition hover:text-paper disabled:opacity-60"
    >
      {busy ? "Saindo..." : "Sair"}
    </button>
  );
}
