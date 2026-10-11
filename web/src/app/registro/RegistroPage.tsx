import { createClient } from "@/lib/supabase/server";
import { LogoFull } from "@/components/Logo";
import { FormularioRegistro } from "./FormularioRegistro";

type Nivel = { id: number; nombre: string; descripcion: string | null };

/** Página de registro público, compartida por /registro y /registro/[codigo]. */
export async function RegistroPage({ codigo }: { codigo: string }) {
  const supabase = await createClient();
  const [{ data: param }, { data: link }, { data: niveles }] = await Promise.all([
    supabase.from("parametros").select("valor").eq("clave", "registro_habilitado").maybeSingle(),
    supabase.from("links_registro").select("id, nombre_origen, nivel_id, activo, vence_en").eq("codigo", codigo).maybeSingle(),
    supabase.from("niveles").select("id, nombre, descripcion").eq("activo", true).order("orden"),
  ]);
  const habilitado = param?.valor === "true";
  const linkValido = !!link && link.activo && (!link.vence_en || link.vence_en >= new Date().toISOString().slice(0, 10));
  const N = (niveles ?? []) as Nivel[];
  const nivelFijo = link?.nivel_id ? N.find((n) => n.id === link.nivel_id) ?? null : null;

  return (
    <main className="min-h-dvh">
      <header className="panel-navy border-b-4 border-lime px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <LogoFull width={180} />
          <span className="text-xs text-teal uppercase tracking-widest">Registro de alumnos</span>
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
            <p className="text-muted mt-1 mb-6">Toma menos de 3 minutos. Cuando aprobemos tu registro, recibirás tu acceso por WhatsApp.</p>
            <FormularioRegistro codigo={codigo} niveles={N} nivelFijo={nivelFijo} />
          </>
        )}
      </div>
    </main>
  );
}
