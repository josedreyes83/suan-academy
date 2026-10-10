import { redirect } from "next/navigation";
import { getSesion, inicioPorRol } from "@/lib/auth";
import { cerrarSesion } from "../admin/actions";

export default async function Page() {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (!sesion.roles.includes("alumno") && !sesion.roles.includes("acudiente")) redirect(inicioPorRol(sesion.roles));
  return (
    <main className="min-h-dvh p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-extrabold text-ink">Hola, {sesion.nombres}</h1>
      <p className="text-muted mt-2">Tu módulo llega en la siguiente entrega: &quot;Mi clase&quot;, calendario de tu nivel, pagos y vigencia.</p>
      <form action={cerrarSesion} className="mt-6"><button className="btn-ghost">Cerrar sesión</button></form>
    </main>
  );
}
