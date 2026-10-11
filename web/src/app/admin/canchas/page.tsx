import { createClient } from "@/infrastructure/supabase/server";
import { PageHeader, Aviso, Vacio, DIAS } from "@/components/ui";
import { crearCancha, cambiarEstadoCancha, guardarHorario, crearSede, cambiarEstadoSede } from "./actions";

type Horario = { dia_semana: number; hora_inicio: string; hora_fin: string };
type Cancha = { id: number; nombre: string; activa: boolean; observaciones: string | null; sede_id: number; cancha_horarios: Horario[] };
type Sede = { id: number; nombre: string; direccion: string | null; activa: boolean };

export default async function CanchasPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: sedesData }] = await Promise.all([
    supabase.from("canchas").select("id, nombre, activa, observaciones, sede_id, cancha_horarios(dia_semana, hora_inicio, hora_fin)").order("nombre"),
    supabase.from("sedes").select("id, nombre, direccion, activa").order("nombre"),
  ]);
  const canchas = (data ?? []) as Cancha[];
  const sedes = (sedesData ?? []) as Sede[];

  return (
    <>
      <PageHeader
        title="Sedes y canchas"
        subtitle="Cada cancha pertenece a una sede. Registra el horario de apertura por día: las clases solo se pueden programar dentro de ese horario."
      />
      <Aviso ok={ok} error={error} />

      {/* Sedes */}
      <section className="mb-6">
        <h2 className="text-sm font-bold text-ink mb-2">Sedes</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {sedes.map((s) => (
            <div key={s.id} className={`card py-2 px-3 flex items-center gap-3 ${s.activa ? "" : "opacity-60"}`}>
              <div>
                <div className="font-bold text-ink">{s.nombre}</div>
                <div className="text-xs text-muted">{s.direccion ?? "Sin dirección"} · {canchas.filter((c) => c.sede_id === s.id).length} canchas</div>
              </div>
              <form action={cambiarEstadoSede}>
                <input type="hidden" name="id" value={s.id} /><input type="hidden" name="activa" value={s.activa ? "false" : "true"} />
                <button className="text-xs underline text-muted hover:text-ink">{s.activa ? "Inactivar" : "Reactivar"}</button>
              </form>
            </div>
          ))}
        </div>
        <form action={crearSede} className="card grid gap-3 sm:grid-cols-[1fr_2fr_auto] items-end">
          <div><label htmlFor="sede_nombre" className="label">Nueva sede</label><input id="sede_nombre" name="nombre" className="input" placeholder="Calle 100" required /></div>
          <div><label htmlFor="sede_direccion" className="label">Dirección (opcional)</label><input id="sede_direccion" name="direccion" className="input" placeholder="Calle 100 # 10-20" /></div>
          <button className="btn-ghost">Agregar sede</button>
        </form>
      </section>

      <h2 className="text-sm font-bold text-ink mb-2">Canchas</h2>
      <form action={crearCancha} className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto] items-end">
        <div>
          <label htmlFor="sede_id" className="label">Sede</label>
          <select id="sede_id" name="sede_id" className="input" required>{sedes.filter((s) => s.activa).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
        </div>
        <div>
          <label htmlFor="nombre" className="label">Nombre</label>
          <input id="nombre" name="nombre" className="input" placeholder="Cancha 1" required />
        </div>
        <div>
          <label htmlFor="observaciones" className="label">Observaciones (opcional)</label>
          <input id="observaciones" name="observaciones" className="input" placeholder="Ej. en mantenimiento hasta el 20 de octubre" />
        </div>
        <button className="btn-primary">Agregar cancha</button>
      </form>

      {canchas.length === 0 && <Vacio texto="Aún no hay canchas. Agrega la primera." />}

      <div className="grid gap-4">
        {canchas.map((c) => {
          const porDia = new Map(c.cancha_horarios.map((h) => [h.dia_semana, h]));
          return (
            <details key={c.id} className="card" open={canchas.length <= 2}>
              <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer list-none">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-extrabold text-ink">{c.nombre}</span>
                  <span className="text-xs text-muted">{sedes.find((s) => s.id === c.sede_id)?.nombre ?? ""}</span>
                  <span className={c.activa ? "pill-ok" : "pill-off"}>{c.activa ? "Activa" : "Inactiva"}</span>
                </div>
                <span className="text-xs text-muted">
                  {c.cancha_horarios.length === 0
                    ? "Sin horario"
                    : `Abre ${c.cancha_horarios.length} día(s) · ` +
                      [...c.cancha_horarios].sort((a, b) => a.dia_semana - b.dia_semana).map((h) => DIAS[h.dia_semana].slice(0, 3)).join(", ")}
                </span>
              </summary>

              <form action={guardarHorario} className="mt-4">
                <input type="hidden" name="cancha_id" value={c.id} />
                <div className="table-wrap">
                  <table className="table min-w-[460px]">
                    <thead>
                      <tr><th>Día</th><th>Abre</th><th>Desde</th><th>Hasta</th></tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                        const h = porDia.get(d);
                        return (
                          <tr key={d}>
                            <td className="font-medium">{DIAS[d]}</td>
                            <td><input type="checkbox" name={`abre_${d}`} defaultChecked={!!h} aria-label={`Abre ${DIAS[d]}`} /></td>
                            <td><input type="time" name={`ini_${d}`} className="input !w-32" defaultValue={h?.hora_inicio?.slice(0, 5) ?? "06:00"} /></td>
                            <td><input type="time" name={`fin_${d}`} className="input !w-32" defaultValue={h?.hora_fin?.slice(0, 5) ?? "21:00"} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end mt-3">
                  <div>
                    <label className="label" htmlFor={`obs_${c.id}`}>Observaciones</label>
                    <input id={`obs_${c.id}`} name="observaciones" className="input" defaultValue={c.observaciones ?? ""} />
                  </div>
                  <button className="btn-dark">Guardar horario</button>
                </div>
              </form>

              <form action={cambiarEstadoCancha} className="mt-3 flex justify-end">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="activa" value={c.activa ? "false" : "true"} />
                <button className={c.activa ? "btn-danger" : "btn-ghost"}>{c.activa ? "Desactivar cancha" : "Activar cancha"}</button>
              </form>
            </details>
          );
        })}
      </div>
    </>
  );
}
