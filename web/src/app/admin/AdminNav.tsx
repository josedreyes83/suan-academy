"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_ADMIN, itemActivo, type IconoNav } from "./nav";

/** Iconos de los grupos (trazo simple, heredan el color del texto). */
function Icono({ nombre, className = "w-5 h-5" }: { nombre: IconoNav; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (nombre) {
    case "inicio": return <svg viewBox="0 0 24 24" className={className} {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>;
    case "alumnos": return <svg viewBox="0 0 24 24" className={className} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.5A5 5 0 0 1 21.5 19" /></svg>;
    case "clases": return <svg viewBox="0 0 24 24" className={className} {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M8 15h3M13 15h3" /></svg>;
    case "academia": return <svg viewBox="0 0 24 24" className={className} {...p}><path d="M3 21h18" /><path d="M5 21V8l7-4 7 4v13" /><path d="M9 21v-5h6v5" /><path d="M9 12h2M13 12h2" /></svg>;
    case "planes": return <svg viewBox="0 0 24 24" className={className} {...p}><path d="M20 12l-8 8-9-9V4h7z" /><circle cx="7.5" cy="7.5" r="1.3" /><path d="M14 11l3-3" /></svg>;
    case "ajustes": return <svg viewBox="0 0 24 24" className={className} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
  }
}

type Props = { pendientes: number; nombre: string; email: string | null; extra?: React.ReactNode; salir: React.ReactNode };

/**
 * Menú del administrador.
 * Escritorio: barra lateral con grupos siempre visibles.
 * Móvil: botón ☰ que abre un panel; se cierra solo al navegar (cambio de ruta), al tocar fuera o con Esc.
 */
export function AdminNav({ pendientes, nombre, email, extra, salir }: Props) {
  const pathname = usePathname();
  const activo = itemActivo(pathname);
  const grupoActivo = NAV_ADMIN.find((g) => g.items.some((i) => i.href === activo))?.id ?? "inicio";
  const [abierto, setAbierto] = useState(false);
  const [desplegado, setDesplegado] = useState<string>(grupoActivo);

  // Al cambiar de ruta: cerrar el panel móvil y desplegar el grupo de la nueva ruta
  useEffect(() => { setAbierto(false); setDesplegado(grupoActivo); }, [pathname, grupoActivo]);
  // Esc cierra; sin scroll de fondo mientras está abierto
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [abierto]);

  const Badge = ({ n }: { n: number }) => n > 0 ? <span className="ml-auto inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-lime px-1.5 text-[11px] font-bold text-ink">{n}</span> : null;

  const Grupos = ({ acordeon }: { acordeon: boolean }) => (
    <nav aria-label="Secciones" className="grid gap-1">
      {NAV_ADMIN.map((g) => {
        const esInicio = g.items.length === 1 && g.id === "inicio";
        const contieneActivo = g.items.some((i) => i.href === activo);
        const abiertoGrupo = !acordeon || desplegado === g.id;
        const pend = g.items.some((i) => i.badge === "pendientes") ? pendientes : 0;
        if (esInicio) {
          return (
            <Link key={g.id} href="/admin" className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${activo === "/admin" ? "bg-lime text-ink" : "text-neutral-100 hover:bg-white/10"}`}>
              <Icono nombre={g.icono} /> {g.label}
            </Link>
          );
        }
        return (
          <div key={g.id}>
            <button
              type="button"
              onClick={() => acordeon ? setDesplegado((d) => (d === g.id ? "" : g.id)) : undefined}
              aria-expanded={abiertoGrupo}
              className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${contieneActivo ? "text-lime" : "text-neutral-100"} ${acordeon ? "hover:bg-white/10" : "cursor-default"}`}
            >
              <Icono nombre={g.icono} /> {g.label}
              <Badge n={pend} />
              {acordeon && <span className={`ml-1 text-xs opacity-60 transition-transform ${abiertoGrupo ? "rotate-180" : ""}`} aria-hidden>▾</span>}
            </button>
            {abiertoGrupo && (
              <div className="ml-4 pl-4 border-l border-white/15 grid gap-0.5 my-1">
                {g.items.map((i) => (
                  <Link key={i.href} href={i.href} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${activo === i.href ? "bg-lime text-ink font-semibold" : "text-neutral-200 hover:bg-white/10 hover:text-white"}`}>
                    {i.label}
                    {i.badge === "pendientes" && <Badge n={pendientes} />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Móvil: botón ☰ con contador de pendientes */}
      <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir menú" aria-expanded={abierto} className="lg:hidden relative inline-flex items-center justify-center w-11 h-11 rounded-md border border-white/20 text-white">
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        {pendientes > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-lime text-ink text-[11px] font-bold flex items-center justify-center px-1">{pendientes}</span>}
      </button>

      {/* Móvil: panel lateral */}
      {abierto && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAbierto(false)} aria-hidden />
          <aside role="dialog" aria-modal="true" aria-label="Menú" className="absolute inset-y-0 left-0 w-[86%] max-w-xs panel-navy text-white flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="text-sm">
                <div className="font-semibold">{nombre}</div>
                <div className="text-neutral-400 text-xs truncate max-w-[200px]">{email}</div>
              </div>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="w-10 h-10 rounded-md border border-white/20 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3"><Grupos acordeon /></div>
            <div className="p-3 border-t border-white/10 flex items-center justify-between gap-3">{extra}{salir}</div>
          </aside>
        </div>
      )}

      {/* Escritorio: grupos siempre visibles */}
      <div className="hidden lg:block px-3 flex-1 overflow-y-auto"><Grupos acordeon={false} /></div>
    </>
  );
}
