import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { LogoFull } from "@/components/Logo";
import { cerrarSesion } from "./actions";
import { NavLinks } from "./NavLinks";

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
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="panel-navy text-white lg:min-h-dvh flex flex-col border-l-8 border-lime">
        <Link href="/admin" className="block px-4 pt-5 pb-3">
          <LogoFull width={208} />
        </Link>
        <div className="px-5 pb-3 text-[11px] uppercase tracking-widest text-teal">Administración</div>
        <NavLinks items={NAV} />
        <div className="mt-auto p-5 border-t border-white/10 text-sm">
          <div className="font-semibold">{sesion.nombres} {sesion.apellidos}</div>
          <div className="text-neutral-400 text-xs truncate">{sesion.email}</div>
          <form action={cerrarSesion} className="mt-3">
            <button className="btn-ghost w-full !bg-transparent !text-white !border-white/20 hover:!bg-white/10">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="p-4 sm:p-8 max-w-6xl w-full">{children}</main>
    </div>
  );
}
