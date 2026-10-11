import { createClient } from "@/infrastructure/supabase/server";
import { DiasSelector } from "./DiasSelector";
import { SedeCanchasSelector } from "./SedeCanchasSelector";
import { ORDEN_DIAS } from "@/domain/horarios";
import { PageHeader, Aviso, Vacio, DIAS } from "@/components/ui";
import { crearPlantilla, cambiarEstadoPlantilla, eliminarPlantilla } from "./actions";

type Cancha = { id: number; nombre: string; sede_id: number };
type Nivel = { id: number; nombre: string };
type Entrenador = { perfil_id: string; activo: boolean; perfiles: { nombres: string; apellidos: string } | null };
type Plantilla = { id: number; cancha_id: number; dia_semana: number; hora_inicio: string; hora_fin: string; nivel_id: number; tipo: string; entrenador_id: string; cupo: number; activo: boolean };

const h = (t: string) => t.slice(0, 5);


export default async function HorariosPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: canchas }, { data: niveles }, { data: ent }, { data: plantilla }, { data: params }, { data: sedes }] = await Promise.all([
    supabase.from("canchas").select("id, nombre, sede_id").eq("activa", true).order("nombre"),
    supabase.from("niveles").select("id, nombre").eq("activo", true).order("orden"),
    supabase.from("entrenadores").select("perfil_id, activo, perfiles(nombres, apellidos)").eq("activo", true),
    supabase.from("plantilla_bloques").select("*").order("dia_semana").order("hora_inicio"),
    supabase.from("parametros").select("clave, valor").in("clave", ["bloque_duracion_min", "cupo_grupal"]),
    supabase.from("sedes").select("id, nombre").eq("activa", true).order("nombre"),
  ]);
  const C = (canchas ?? []) as Cancha[];
  const S = (sedes ?? []) as { id: number; nombre: string }[];
  const N = (niveles ?? []) as Nivel[];
  const E = (ent ?? []) as unknown as Entrenador[];
  const P = (plantilla ?? []) as Plantilla[];
  const par = Object.fromEntries((params ?? []).map((p) => [p.clave, p.valor]));
  const duracionDef = Number(par.bloque_duracion_min ?? 60);
  const cupoDef = Number(par.cupo_grupal ?? 4);

  const nCancha = (id: number) => C.find((c) => c.id === id)?.nombre ?? `Cancha ${id}`;
  const nNivel = (id: number) => N.find((n) => n.id === id)?.nombre ?? "—";
  const nEnt = (id: string) => { const e = E.find((x) => x.perfil_id === id); return e?.perfiles ? `${e.perfiles.nombres} ${e.perfiles.apellidos}` : "—"; };

  const faltaConfig = C.length === 0 || N.length === 0 || E.length === 0;

  return (
    <>
      <PageHeader
        title="Plantilla semanal"
        subtitle="Qué clase va en cada sede, cancha, día y hora, para qué nivel y con qué entrenador. Se repite cada semana: luego publícala en Clases publicadas."
      />
      <Aviso ok={ok} error={error} />
      {faltaConfig && <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">Antes de armar horarios necesitas al menos una cancha activa, un nivel y un entrenador.</div>}

      {/* Crear bloque de plantilla */}
      <form action={crearPlantilla} className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <div className="lg:col-span-4 text-sm font-bold text-ink">Agregar clase a la plantilla semanal</div>
        <div className="sm:col-span-2 lg:col-span-4"><SedeCanchasSelector sedes={S} canchas={C} /></div>
        <div className="sm:col-span-2 lg:col-span-4"><DiasSelector /></div>
        <div>
          <label className="label" htmlFor="hora_inicio">Hora de inicio</label>
          <input id="hora_inicio" name="hora_inicio" type="time" className="input" step={1800} defaultValue="07:00" required />
        </div>
        <div>
          <label className="label" htmlFor="duracion">Duración (min)</label>
          <input id="duracion" name="duracion" type="number" className="input" min={30} max={240} step={15} defaultValue={duracionDef} />
        </div>
        <div>
          <label className="label" htmlFor="nivel_id">Nivel</label>
          <select id="nivel_id" name="nivel_id" className="input" required>{N.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select>
        </div>
        <div>
          <label className="label" htmlFor="tipo">Tipo de clase</label>
          <select id="tipo" name="tipo" className="input" defaultValue="grupal"><option value="grupal">Grupal (mensualidad)</option><option value="personalizada">Personalizada (paquete / sesión)</option></select>
        </div>
        <div>
          <label className="label" htmlFor="entrenador_id">Entrenador</label>
          <select id="entrenador_id" name="entrenador_id" className="input" required>{E.map((e) => <option key={e.perfil_id} value={e.perfil_id}>{e.perfiles ? `${e.perfiles.nombres} ${e.perfiles.apellidos}` : e.perfil_id}</option>)}</select>
        </div>
        <div>
          <label className="label" htmlFor="cupo">Cupo</label>
          <input id="cupo" name="cupo" type="number" className="input" min={1} max={20} defaultValue={cupoDef} />
          <p className="text-xs text-muted mt-1">Personalizada: pon 1.</p>
        </div>
        <div className="lg:col-span-4 flex justify-end"><button className="btn-primary" disabled={faltaConfig}>Agregar a la plantilla</button></div>
      </form>

      {/* Plantilla por día */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-ink mb-2">Plantilla semanal ({P.filter((p) => p.activo).length} clases activas)</h2>
        {P.length === 0 && <Vacio texto="La plantilla está vacía. Agrega la primera clase arriba." />}
        <div className="grid gap-3 lg:grid-cols-2">
          {ORDEN_DIAS.filter((d) => P.some((p) => p.dia_semana === d)).map((d) => (
            <div key={d} className="card">
              <div className="font-extrabold text-ink mb-2">{DIAS[d]}</div>
              <div className="table-wrap"><table className="table min-w-[560px]">
                <thead><tr><th>Hora</th><th>Cancha</th><th>Nivel</th><th>Tipo</th><th>Entrenador</th><th>Cupo</th><th></th></tr></thead>
                <tbody>
                  {P.filter((p) => p.dia_semana === d).map((p) => (
                    <tr key={p.id} className={p.activo ? "" : "opacity-50"}>
                      <td className="font-mono">{h(p.hora_inicio)}–{h(p.hora_fin)}</td>
                      <td>{nCancha(p.cancha_id)}</td>
                      <td>{nNivel(p.nivel_id)}</td>
                      <td>{p.tipo === "grupal" ? "Grupal" : "Personal."}</td>
                      <td>{nEnt(p.entrenador_id)}</td>
                      <td>{p.cupo}</td>
                      <td className="whitespace-nowrap">
                        <form action={cambiarEstadoPlantilla} className="inline">
                          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="activo" value={p.activo ? "false" : "true"} />
                          <button className="text-xs underline text-muted hover:text-ink">{p.activo ? "Pausar" : "Reactivar"}</button>
                        </form>
                        <form action={eliminarPlantilla} className="inline ml-2">
                          <input type="hidden" name="id" value={p.id} />
                          <button className="text-xs underline text-danger">Eliminar</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          ))}
        </div>
      </section>

    </>
  );
}
