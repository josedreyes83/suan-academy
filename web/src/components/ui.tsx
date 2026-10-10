import Link from "next/link";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink flex items-center gap-3">
          <span className="inline-block w-2.5 h-7 bg-lime rounded-sm" aria-hidden="true" />
          {title}
        </h1>
        {subtitle && <p className="text-muted text-sm mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Mensaje de resultado leído de ?ok= / ?error= en la URL */
export function Aviso({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role="status"
      className={`mb-4 rounded-md px-4 py-3 text-sm ${
        error ? "bg-danger/10 text-danger border border-danger/30" : "bg-lime/30 text-ink border border-lime"
      }`}
    >
      {error ?? ok}
    </div>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return <p className="text-sm text-muted py-6 text-center">{texto}</p>;
}

export function Volver({ href, label = "Volver" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="text-sm text-muted hover:text-ink">
      ← {label}
    </Link>
  );
}

export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function formatoCOP(valor: number | string) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor));
}
