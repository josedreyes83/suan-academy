import { createClient } from "@/infrastructure/supabase/server";
import { PageHeader, Aviso, Vacio, DIAS } from "@/components/ui";
import { crearFranja, cambiarEstadoFranja, eliminarFranja } from "./actions";
import { TipoFranja } from "./TipoFranja";

type Cancha = { id: number; nombre: string };
type Franja = {
  id: number; cancha_id: number | null; dia_semana: number | null; fecha: string | null;
  hora_inicio: string; hora_fin: string; motivo: string; activo: boolean;
};

const h = (t: string) => t.slice(0, 5);

export default async function FranjasPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: canchas }, { data: franjas }] = await Promise.all([
    supabase.from("canchas").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.from("franjas_bloqueadas").select("*").order("fecha", { ascending: true, nullsFirst: true }).order("dia_semana").order("hora_inicio"),
  ]);
  const C = (canchas ?? []) as Cancha[];
  const F = (franjas ?? []) as Franja[];
  const nombreCancha = (id: number | null) => (id === null ? "Todas las canchas" : C.find((c) => c.id === id)?.nombre ?? `Cancha ${id}`);
  const recurrentes = F.filter((f) => f.dia_semana !== null);
  const puntuales = F.filter((f) => f.fecha !== null);

  return (
    <>
      <PageHeader
        title="Franjas horarias"
        subtitle="Bloquea rangos de hora para que no se puedan programar clases ahí: recurrentes (todos los lunes de 12 a 2) o puntuales (un torneo el 12 de octubre). El selector de horas solo ofrece franjas disponibles y la base de datos rechaza cualquier bloque que las pise."
      />
      <Aviso ok={ok} error={error} />

      <form action={crearFranja} className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
        <div className="lg:col-span-6 text-sm font-bold text-ink">Bloquear franja</div>
        <div>
          <label className="label" htmlFor="cancha_id">Cancha</label>
          <select id="cancha_id" name="cancha_id" className="input" defaultValue="">
            <option value="">Todas las canchas</option>
            {C.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <TipoFranja />
        <div>
          <label className="label" htmlFor="hora_inicio">Desde</label>
          <input id="hora_inicio" name="hora_inicio" type="time" className="input" required defaultValue="12:00" />
        </div>
        <div>
          <label className="label" htmlFor="hora_fin">Hasta</label>
          <input id="hora_fin" name="hora_fin" type="time" className="input" required defaultValue="14:00" />
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <label className="label" htmlFor="motivo">Motivo</label>
          <input id="motivo" name="motivo" className="input" placeholder="Ej. mantenimiento de piso, torneo, almuerzo del equipo" required />
        </div>
        <button className="btn-primary">Bloquear</button>
      </form>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-bold text-ink mb-2">Recurrentes (cada semana)</h2>
          {recurrentes.length === 0 ? <Vacio texto="Sin bloqueos recurrentes." /> : (
            <div className="card table-wrap">
              <table className="table min-w-[420px]">
                <thead><tr><th>Día</th><th>Hora</th><th>Cancha</th><th>Motivo</th><th></th></tr></thead>
                <tbody>
                  {recurrentes.map((f) => <Fila key={f.id} f={f} etiqueta={DIAS[f.dia_semana!]} cancha={nombreCancha(f.cancha_id)} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-sm font-bold text-ink mb-2">Puntuales (una fecha)</h2>
          {puntuales.length === 0 ? <Vacio texto="Sin bloqueos por fecha." /> : (
            <div className="card table-wrap">
              <table className="table min-w-[420px]">
                <thead><tr><th>Fecha</th><th>Hora</th><th>Cancha</th><th>Motivo</th><th></th></tr></thead>
                <tbody>
                  {puntuales.map((f) => <Fila key={f.id} f={f} etiqueta={f.fecha!} cancha={nombreCancha(f.cancha_id)} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Fila({ f, etiqueta, cancha }: { f: Franja; etiqueta: string; cancha: string }) {
  return (
    <tr className={f.activo ? "" : "opacity-60"}>
      <td className="font-medium">{etiqueta}</td>
      <td>{h(f.hora_inicio)}–{h(f.hora_fin)}</td>
      <td>{cancha}</td>
      <td>{f.motivo} {!f.activo && <span className="pill-off ml-1">Habilitada</span>}</td>
      <td className="whitespace-nowrap">
        <form action={cambiarEstadoFranja} className="inline">
          <input type="hidden" name="id" value={f.id} />
          <input type="hidden" name="activo" value={f.activo ? "false" : "true"} />
          <button className="text-xs underline text-muted hover:text-ink mr-2">{f.activo ? "Habilitar" : "Bloquear"}</button>
        </form>
        <form action={eliminarFranja} className="inline">
          <input type="hidden" name="id" value={f.id} />
          <button className="text-xs underline text-danger">Eliminar</button>
        </form>
      </td>
    </tr>
  );
}
