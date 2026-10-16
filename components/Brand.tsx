/** Marca textual: "ROCHA" em preto/branco com um bloco vermelho e "ACADEMY". */
export function Brand({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display uppercase leading-none ${className}`}>
      <span aria-hidden className="inline-block h-5 w-2 bg-red" />
      <span className={`text-xl tracking-wide ${dark ? "text-paper" : "text-ink"}`}>Rocha</span>
      <span className={`text-xs tracking-[0.3em] ${dark ? "text-muted-dark" : "text-muted"}`}>Academy</span>
    </span>
  );
}
