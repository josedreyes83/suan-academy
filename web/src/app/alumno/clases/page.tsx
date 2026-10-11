import { createClient } from "@/infrastructure/supabase/server";
import { Aviso, Vacio } from "@/components/ui";
import { alumnoActual, catalogos, h, fechaLarga, hoyISO, type Bloque } from "../lib";
import { reservarClase } from "../actions";

export default async function EscogerClase({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const alumno = await alumnoActual();
  if (!alumno) return <div className="card text-center py-10 text-muted">Tu cuenta aún no está vinculada a un alumno aprobado.</div>;
  const supabase = await createClient();
  const hoy = hoyISO();
  const hasta = new Date(); hasta.setDate(hasta.getDate() + 14);
  const [{ data: bl }, { data: mias }, cat] = await Promise.all([
    supabase.from("v_bloques_cupo").select("*").eq("estado", "publicado").eq("nivel_id", alumno.nivel_id ?? -1).gte("fecha", hoy).lte("fecha", hasta.toISOString().slice(0, 10)).order("fecha").order("hora_inicio"),
    supabase.from("inscripciones").select("bloque_id").eq("alumno_id", alumno.id).eq("estado", "inscrito"),
    catalogos(),
  ]);
  const ahora = new Date();
  const B = ((bl ?? []) as Bloque[]).filter((b) => new Date(`${b.fecha}T${b.hora_inicio}`) > ahora);
  const reservadas = new Set((mias ?? []).map((m) => m.bloque_id));
  const fechas = Array.from(new Set(B.map((b) => b.fecha)));

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">Escoger clase</h1>
        <p className="text-muted text-sm">Clases de tu nivel ({alumno.niveles?.nombre ?? "—"}) publicadas para los próximos 14 días. Toca «Reservar» y queda en «Mis clases».</p>
      </div>
      <Aviso ok={ok} error={error} />
      {B.length === 0 && <div className="card"><Vacio texto="La academia aún no ha publicado clases de tu nivel para estos días. Vuelve a revisar más tarde." /></div>}
      <div className="grid gap-5">
        {fechas.map((f) => (
          <section key={f}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-2">{fechaLarga(f)}</h2>
            <div className="grid gap-2">
              {B.filter((b) => b.fecha === f).map((b) => {
                const lleno = Number(b.inscritos) >= b.cupo;
                const mia = reservadas.has(b.id);
                return (
                  <div key={b.id} className={`card flex flex-wrap items-center justify-between gap-3 py-3 ${mia ? "border-l-4 border-l-lime" : ""}`}>
                    <div>
                      <div className="text-lg font-extrabold text-ink">{h(b.hora_inicio)}–{h(b.hora_fin)} <span className="text-sm font-semibold text-muted">· {cat.nCancha(b.cancha_id)}</span></div>
                      <div className="text-sm text-muted">{b.tipo === "grupal" ? "Grupal" : "Personalizada"} · {cat.nEnt(b.entrenador_id)} · {lleno ? "Sin cupo" : `${b.cupo - Number(b.inscritos)} cupos`}</div>
                    </div>
                    {mia ? <span className="pill-ok">Reservada</span> : lleno ? <span className="pill-off">Llena</span> : (
                      <form action={reservarClase}>
                        <input type="hidden" name="bloque_id" value={b.id} />
                        <button className="btn-primary !py-1.5 !px-4 text-sm">Reservar</button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
