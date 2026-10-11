import { estadoLinkRegistro } from "@/application/registro";
import { registroRepo } from "@/infrastructure/supabase/repos";
import { LogoFull } from "@/components/Logo";
import { FormularioRegistro } from "./FormularioRegistro";

/** Página de registro público, compartida por /registro y /registro/[codigo]. */
export async function RegistroPage({ codigo }: { codigo: string }) {
  const { registroHabilitado: habilitado, valido: linkValido } = await estadoLinkRegistro(registroRepo(), codigo);

  return (
    <main className="min-h-dvh">
      <header className="panel-navy border-b-4 border-lime px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <LogoFull width={180} className="w-[140px] sm:w-[180px] h-auto" />
          <span className="text-[11px] sm:text-xs text-teal uppercase tracking-widest text-right">Registro de alumnos</span>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {!habilitado || !linkValido ? (
          <div className="card text-center py-10">
            <h1 className="text-2xl font-extrabold text-ink">Registro cerrado</h1>
            <p className="text-muted mt-2">
              {!habilitado ? "Por el momento no estamos recibiendo registros nuevos." : "Este link de registro ya no está disponible."} Escríbenos por WhatsApp y te contamos cuándo abre.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">Regístrate en SUAN Academy</h1>
            <p className="text-muted mt-1 mb-6">Toma menos de 3 minutos. Cuando aprobemos tu registro, el entrenador definirá tu nivel y recibirás tu acceso por WhatsApp.</p>
            <FormularioRegistro codigo={codigo} />
          </>
        )}
      </div>
    </main>
  );
}
