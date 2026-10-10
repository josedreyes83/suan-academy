import { requireRol } from "@/lib/auth";
import { cerrarSesion } from "../admin/actions";

export default async function Page() {
  const sesion = await requireRol("entrenador");
  return (
    <main className="min-h-dvh p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-extrabold text-ink">Hola, {sesion.nombres}</h1>
      <p className="text-muted mt-2">Tu módulo de entrenador llega en la siguiente entrega: calendario, asistencia y registro de sesión.</p>
      <form action={cerrarSesion} className="mt-6"><button className="btn-ghost">Cerrar sesión</button></form>
    </main>
  );
}
