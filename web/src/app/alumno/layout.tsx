import Link from "next/link";
import { redirect } from "next/navigation";
import { getSesion, inicioPorRol } from "@/infrastructure/sesion";
import { LogoFull } from "@/components/Logo";
import { cerrarSesion } from "../admin/actions";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { temaActual } from "@/infrastructure/tema";

const NAV = [
  { href: "/alumno", label: "Mis clases" },
  { href: "/alumno/clases", label: "Escoger clase" },
];

export default async function AlumnoLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  const tema = await temaActual();
  if (!sesion.roles.includes("alumno") && !sesion.roles.includes("acudiente")) redirect(inicioPorRol(sesion.roles));
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="panel-navy text-white border-b-4 border-lime sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-4">
          <Link href="/alumno"><LogoFull width={160} className="w-[130px] sm:w-[160px] h-auto" /></Link>
          <div className="text-right text-sm">
            <div className="font-semibold truncate max-w-[160px] sm:max-w-none">{sesion.nombres} {sesion.apellidos}</div>
            <div className="flex items-center justify-end gap-3">
              <ThemeToggle inicial={tema} compacto />
              <form action={cerrarSesion}><button className="text-xs text-neutral-300 underline hover:text-lime">Cerrar sesión</button></form>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-1"><NavLinks items={NAV} /></div>
      </header>
      <main className="max-w-3xl w-full mx-auto p-4 sm:p-6 min-w-0">{children}</main>
    </div>
  );
}
