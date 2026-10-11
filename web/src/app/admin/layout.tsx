import Link from "next/link";
import { requireRol } from "@/infrastructure/sesion";
import { createClient } from "@/infrastructure/supabase/server";
import { LogoFull } from "@/components/Logo";
import { cerrarSesion } from "./actions";
import { AdminNav } from "./AdminNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { temaActual } from "@/infrastructure/tema";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requireRol("administrador");
  const [tema, supabase] = await Promise.all([temaActual(), createClient()]);
  const { count } = await supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado_registro", "pendiente");
  const pendientes = count ?? 0;
  const salir = (
    <form action={cerrarSesion}>
      <button className="btn-ghost !bg-transparent !text-white !border-white/20 hover:!bg-white/10">Cerrar sesión</button>
    </form>
  );

  return (
    <div className="min-h-dvh w-full max-w-[100vw] overflow-x-clip lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="panel-navy text-white lg:sticky lg:top-0 lg:h-dvh flex flex-col border-l-4 lg:border-l-8 border-lime">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:pt-5 lg:pb-4">
          <Link href="/admin" className="block">
            <LogoFull width={208} className="w-[150px] lg:w-[208px] h-auto" />
          </Link>
          {/* Móvil: botón de menú (dentro de AdminNav) */}
          <div className="lg:hidden">
            <AdminNav pendientes={pendientes} nombre={`${sesion.nombres} ${sesion.apellidos}`} email={sesion.email} extra={<ThemeToggle inicial={tema} compacto />} salir={salir} />
          </div>
        </div>
        {/* Escritorio: grupos en la barra lateral */}
        <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
          <AdminNav pendientes={pendientes} nombre={`${sesion.nombres} ${sesion.apellidos}`} email={sesion.email} salir={salir} />
          <div className="p-5 border-t border-white/10 text-sm">
            <div className="font-semibold">{sesion.nombres} {sesion.apellidos}</div>
            <div className="text-neutral-400 text-xs truncate">{sesion.email}</div>
            <div className="mt-3"><ThemeToggle inicial={tema} /></div>
            <div className="mt-3 [&_button]:w-full">{salir}</div>
          </div>
        </div>
      </aside>
      <main className="p-4 sm:p-6 lg:p-8 max-w-6xl w-full min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
