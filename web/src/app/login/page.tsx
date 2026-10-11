import { LogoFull } from "@/components/Logo";
import { LoginForm } from "./LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { temaActual } from "@/lib/tema";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const tema = await temaActual();
  return (
    <main className="min-h-dvh flex flex-col lg:grid lg:grid-cols-2">
      <section className="panel-navy text-white p-5 sm:p-8 lg:p-12 flex flex-col justify-between gap-6 lg:gap-0 border-l-4 lg:border-l-8 border-lime">
        <div className="flex items-start justify-between gap-4">
          <LogoFull width={300} className="w-[180px] sm:w-[240px] lg:w-[300px] h-auto" />
          <ThemeToggle inicial={tema} compacto />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal mb-4">SUAN Academy</p>
          <h1 className="text-[26px] sm:text-4xl lg:text-5xl font-extrabold leading-[1.1] lg:leading-[1.05] tracking-tight max-w-lg">
            Entrena tu cuerpo,
            <br />
            <span className="text-lime">fortalece tus hábitos</span>
            <br />
            y avanza con confianza.
          </h1>
          <div className="mt-4 lg:mt-6 h-1.5 w-16 lg:w-24 rounded-full bg-lime" aria-hidden />
        </div>
        <p className="hidden lg:block text-xs text-teal">Versión 1 · 2026</p>
      </section>
      <section className="flex-1 flex items-start lg:items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold text-ink">Iniciar sesión</h2>
          <p className="text-sm text-muted mb-6">Entra con el correo y la contraseña que te asignó la academia.</p>
          <LoginForm next={next ?? "/"} />
        </div>
      </section>
    </main>
  );
}
