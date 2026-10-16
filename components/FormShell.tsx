import { Brand } from "@/components/Brand";

/** Moldura escura e mobile-first do formulário público (também usada na pré-visualização). */
export function FormShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative flex flex-col overflow-hidden bg-ink text-paper ${className}`}>
      <div aria-hidden className="pointer-events-none absolute -right-24 top-0 h-full w-48 -skew-x-12 bg-red/10" />
      <header className="relative px-5 pt-6 sm:px-8">
        <Brand dark />
      </header>
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-10 sm:px-8">
        {children}
      </div>
    </div>
  );
}
