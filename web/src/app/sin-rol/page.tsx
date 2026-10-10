import { cerrarSesion } from "../admin/actions";

export default function SinRol() {
  return (
    <main className="min-h-dvh p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-extrabold text-ink">Tu cuenta aún no tiene un rol</h1>
      <p className="text-muted mt-2">Pide al administrador de SUAN Academy que te asigne un rol para entrar.</p>
      <form action={cerrarSesion} className="mt-6"><button className="btn-ghost">Cerrar sesión</button></form>
    </main>
  );
}
