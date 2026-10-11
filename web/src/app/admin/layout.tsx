import Link from "next/link";
import { requireRol } from "@/infrastructure/sesion";
import { LogoFull } from "@/components/Logo";
import { cerrarSesion } from "./actions";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { temaActual } from "@/infrastructure/tema";

export const NAV = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/canchas", label: "Canchas" },
  { href: "/admin/franjas", label: "Franjas horarias" },
  { href: "/admin/niveles", label: "Niveles" },
  { href: "/admin/tipos-alumno", label: "Tipos de alumno" },
  { href: "/admin/precios", label: "Precios" },
  { href: "/admin/entrenadores", label: "Entrenadores" },
  { href: "/admin/parametros", label: "Parámetros" },
  { href: "/admin/horarios", label: "Horarios" },
  { href: "/admin/registro", label: "Registro de alumnos" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requireRol("administrador");
  const tema = await temaActual();
  return (
    <div className="min-h-dvh w-full max-w-[100vw] overflow-x-clip lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="panel-navy text-white lg:min-h-dvh lg:sticky lg:top-0 lg:h-dvh flex flex-col border-l-4 lg:border-l-8 border-lime">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 lg:pt-5 lg:pb-3">
          <Link href="/admin" className="block">
            <LogoFull width={208} className="w-[150px] lg:w-[208px] h-auto" />
          </Link>
          {/* Móvil: acciones rápidas en la misma fila del logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle inicial={tema} compacto />
            <form action={cerrarSesion}><button className="text-xs text-neutral-300 underline hover:text-lime">Salir</button></form>
          </div>
        </div>
        <div className="hidden lg:block px-5 pb-3 text-[11px] uppercase tracking-widest text-teal">Administración</div>
        <NavLinks items={NAV} />
        <div className="hidden lg:block mt-auto p-5 border-t border-white/10 text-sm">
          <div className="font-semibold">{sesion.nombres} {sesion.apellidos}</div>
          <div className="text-neutral-400 text-xs truncate">{sesion.email}</div>
          <div className="mt-3"><ThemeToggle inicial={tema} /></div>
          <form action={cerrarSesion} className="mt-3">
            <button className="btn-ghost w-full !bg-transparent !text-white !border-white/20 hover:!bg-white/10">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="p-4 sm:p-6 lg:p-8 max-w-6xl w-full min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
