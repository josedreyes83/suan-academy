import { LogoFull } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="min-h-dvh grid lg:grid-cols-2">
      <section className="panel-navy text-white p-8 sm:p-12 flex flex-col justify-between border-l-8 border-lime">
        <LogoFull width={300} />
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight max-w-md">
            La academia, organizada en un solo lugar.
          </h1>
          <p className="mt-4 text-neutral-300 max-w-md">
            Horarios por cancha y nivel, registro de alumnos, pagos y vigencia, y la clase de hoy
            visible para cada familia.
          </p>
        </div>
        <p className="text-xs text-teal">Versión 1 · 2026</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold text-ink">Iniciar sesión</h2>
          <p className="text-sm text-muted mb-6">Entra con el correo y la contraseña que te asignó la academia.</p>
          <LoginForm next={next ?? "/"} />
        </div>
      </section>
    </main>
  );
}
