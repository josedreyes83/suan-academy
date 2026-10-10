import { createClient } from "@/lib/supabase/server";
import { PageHeader, Aviso, Vacio } from "@/components/ui";
import { crearEntrenador, actualizarEntrenador } from "./actions";

type Nivel = { id: number; nombre: string };
type Entrenador = {
  perfil_id: string;
  activo: boolean;
  perfiles: { nombres: string; apellidos: string; correo: string | null; celular: string | null } | null;
  entrenador_niveles: { nivel_id: number }[];
};

export default async function EntrenadoresPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: ent }, { data: niv }] = await Promise.all([
    supabase.from("entrenadores").select("perfil_id, activo, perfiles(nombres, apellidos, correo, celular), entrenador_niveles(nivel_id)"),
    supabase.from("niveles").select("id, nombre").eq("activo", true).order("orden"),
  ]);
  const entrenadores = (ent ?? []) as unknown as Entrenador[];
  const niveles = (niv ?? []) as Nivel[];
  const sinClave = !process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    <>
      <PageHeader
        title="Entrenadores"
        subtitle="Cada entrenador entra con su propio correo. Solo aparece en los bloques de los niveles que dicta y no puede estar en dos bloques a la misma hora."
      />
      <Aviso ok={ok} error={error} />
      {sinClave && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Para crear cuentas de entrenador, agrega la clave <code>SUPABASE_SERVICE_ROLE_KEY</code> en las variables del servidor (Supabase → Project Settings → API).
        </div>
      )}

      <form action={crearEntrenador} className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3 text-sm font-bold text-ink">Nuevo entrenador</div>
        <div><label className="label" htmlFor="nombres">Nombres</label><input id="nombres" name="nombres" className="input" required /></div>
        <div><label className="label" htmlFor="apellidos">Apellidos</label><input id="apellidos" name="apellidos" className="input" required /></div>
        <div><label className="label" htmlFor="celular">Celular</label><input id="celular" name="celular" className="input" inputMode="tel" /></div>
        <div><label className="label" htmlFor="correo">Correo (usuario)</label><input id="correo" name="correo" type="email" className="input" required /></div>
        <div><label className="label" htmlFor="clave">Contraseña inicial (mín. 8)</label><input id="clave" name="clave" type="text" className="input" minLength={8} required /></div>
        <fieldset>
          <legend className="label">Niveles que dicta</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            {niveles.map((n) => (
              <label key={n.id} className="flex items-center gap-1"><input type="checkbox" name="niveles" value={n.id} /> {n.nombre}</label>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2 lg:col-span-3 flex justify-end"><button className="btn-primary" disabled={sinClave}>Crear entrenador</button></div>
      </form>

      {entrenadores.length === 0 && <Vacio texto="Aún no hay entrenadores." />}

      <div className="grid gap-3 md:grid-cols-2">
        {entrenadores.map((e) => {
          const dicta = new Set(e.entrenador_niveles.map((x) => x.nivel_id));
          return (
            <form key={e.perfil_id} action={actualizarEntrenador} className={`card ${e.activo ? "" : "opacity-70"}`}>
              <input type="hidden" name="id" value={e.perfil_id} />
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-extrabold text-ink">{e.perfiles?.nombres} {e.perfiles?.apellidos}</span>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="activo" defaultChecked={e.activo} /> Activo</label>
              </div>
              <div className="text-xs text-muted mb-3">{e.perfiles?.correo}</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><label className="label">Nombres</label><input name="nombres" className="input" defaultValue={e.perfiles?.nombres ?? ""} required /></div>
                <div><label className="label">Apellidos</label><input name="apellidos" className="input" defaultValue={e.perfiles?.apellidos ?? ""} required /></div>
                <div><label className="label">Celular</label><input name="celular" className="input" defaultValue={e.perfiles?.celular ?? ""} /></div>
              </div>
              <fieldset className="mt-3">
                <legend className="label">Niveles que dicta</legend>
                <div className="flex flex-wrap gap-3 text-sm">
                  {niveles.map((n) => (
                    <label key={n.id} className="flex items-center gap-1"><input type="checkbox" name="niveles" value={n.id} defaultChecked={dicta.has(n.id)} /> {n.nombre}</label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-3 flex justify-end"><button className="btn-dark">Guardar</button></div>
            </form>
          );
        })}
      </div>
    </>
  );
}
