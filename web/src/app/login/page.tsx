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
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal mb-4">SUAN Academy</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight max-w-lg">
            Entrena tu cuerpo,
            <br />
            <span className="text-lime">fortalece tus hábitos</span>
            <br />
            y avanza con confianza.
          </h1>
          <div className="mt-6 h-1.5 w-24 rounded-full bg-lime" aria-hidden />
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
