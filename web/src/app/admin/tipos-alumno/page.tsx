import { createClient } from "@/lib/supabase/server";
import { PageHeader, Aviso } from "@/components/ui";
import { actualizarTipo, crearTipo } from "./actions";

type Tipo = { id: number; codigo: string; nombre: string; beneficios: string | null; activo: boolean };

export default async function TiposAlumnoPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("tipos_alumno").select("*").order("id");
  const tipos = (data ?? []) as Tipo[];

  return (
    <>
      <PageHeader
        title="Tipos de alumno"
        subtitle="Todo alumno nuevo entra como Normal. Solo el administrador cambia un alumno a VIP, y queda registrado quién y cuándo. Cada tipo tiene su propio precio por producto."
      />
      <Aviso ok={ok} error={error} />

      <div className="grid gap-3 md:grid-cols-2">
        {tipos.map((t) => (
          <form key={t.id} action={actualizarTipo} className="card">
            <input type="hidden" name="id" value={t.id} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-widest text-muted uppercase">{t.codigo}</span>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="activo" defaultChecked={t.activo} /> Activo
              </label>
            </div>
            <label className="label" htmlFor={`n_${t.id}`}>Nombre</label>
            <input id={`n_${t.id}`} name="nombre" className="input mb-3" defaultValue={t.nombre} required />
            <label className="label" htmlFor={`b_${t.id}`}>Beneficios</label>
            <textarea id={`b_${t.id}`} name="beneficios" className="input" rows={3} defaultValue={t.beneficios ?? ""} />
            <div className="mt-3 flex justify-end"><button className="btn-dark">Guardar</button></div>
          </form>
        ))}

        <form action={crearTipo} className="card border-dashed">
          <div className="text-sm font-bold text-ink mb-3">Nuevo tipo (opcional)</div>
          <label className="label" htmlFor="nuevo_nombre">Nombre</label>
          <input id="nuevo_nombre" name="nombre" className="input mb-3" placeholder="Ej. Familiar" required />
          <label className="label" htmlFor="nuevo_ben">Beneficios</label>
          <textarea id="nuevo_ben" name="beneficios" className="input" rows={3} />
          <div className="mt-3 flex justify-end"><button className="btn-primary">Agregar tipo</button></div>
        </form>
      </div>
    </>
  );
}
