import { createClient } from "@/infrastructure/supabase/server";
import { PageHeader, Aviso, Vacio } from "@/components/ui";
import { publicarSemana, cancelarBloque } from "../actions";

type Cancha = { id: number; nombre: string };
type Nivel = { id: number; nombre: string };
type Entrenador = { perfil_id: string; perfiles: { nombres: string; apellidos: string } | null };
type Bloque = { id: string; fecha: string; cancha_id: number; hora_inicio: string; hora_fin: string; nivel_id: number; tipo: string; entrenador_id: string; cupo: number; estado: string; inscritos: number; motivo_cancelacion: string | null };

const h = (t: string) => t.slice(0, 5);
function proximoLunes(desde = new Date()) {
  const d = new Date(desde); d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  d.setDate(d.getDate() + ((8 - dow) % 7 || 7));
  return d.toISOString().slice(0, 10);
}
function lunesDe(fecha: string) {
  const d = new Date(fecha + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
const fechaLarga = (f: string) => new Date(f + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

export default async function ClasesPublicadasPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const [{ data: canchas }, { data: niveles }, { data: ent }, { data: bloques }, { count: enPlantilla }] = await Promise.all([
    supabase.from("canchas").select("id, nombre"),
    supabase.from("niveles").select("id, nombre"),
    supabase.from("entrenadores").select("perfil_id, perfiles(nombres, apellidos)"),
    supabase.from("v_bloques_cupo").select("*").gte("fecha", hoy).order("fecha").order("hora_inicio"),
    supabase.from("plantilla_bloques").select("id", { count: "exact", head: true }).eq("activo", true),
  ]);
  const C = (canchas ?? []) as Cancha[];
  const N = (niveles ?? []) as Nivel[];
  const E = (ent ?? []) as unknown as Entrenador[];
  const B = (bloques ?? []) as Bloque[];
  const nCancha = (id: number) => C.find((c) => c.id === id)?.nombre ?? `Cancha ${id}`;
  const nNivel = (id: number) => N.find((n) => n.id === id)?.nombre ?? "—";
  const nEnt = (id: string) => { const e = E.find((x) => x.perfil_id === id); return e?.perfiles ? `${e.perfiles.nombres} ${e.perfiles.apellidos}` : "—"; };
  const semanas = Array.from(new Set(B.map((b) => lunesDe(b.fecha)))).sort();

  return (
    <>
      <PageHeader
        title="Clases publicadas"
        subtitle="Publica una semana a partir de la plantilla: se crean las clases con fecha y los alumnos de cada nivel pueden reservarlas. Aquí también puedes cancelar una clase."
      />
      <Aviso ok={ok} error={error} />
      {(enPlantilla ?? 0) === 0 && <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">La plantilla semanal está vacía: agrega clases en Clases → Plantilla semanal antes de publicar.</div>}
      {/* Publicar semana */}
      <section className="mb-8">
        <div className="card panel-navy text-white border-ink flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold tracking-widest text-teal uppercase">Publicar semana</div>
            <div className="text-lg font-extrabold">Crea las clases de una semana a partir de la plantilla</div>
            <p className="text-sm text-neutral-300 mt-1 max-w-xl">Se puede publicar varias veces: las clases que ya existan no se duplican. Las que caigan en franjas bloqueadas se omiten y se informan.</p>
          </div>
          <form action={publicarSemana} className="flex flex-wrap items-end gap-3 w-full sm:w-auto">
            <div>
              <label className="label !text-neutral-300" htmlFor="lunes">Lunes de la semana</label>
              <input id="lunes" name="lunes" type="date" className="input" defaultValue={proximoLunes()} required />
            </div>
            <button className="btn-primary" disabled={(enPlantilla ?? 0) === 0}>Publicar</button>
          </form>
        </div>
      </section>

      {/* Clases publicadas */}
      <section>
        <h2 className="text-sm font-bold text-ink mb-2">Clases publicadas (desde hoy)</h2>
        {B.length === 0 && <Vacio texto="Aún no hay clases publicadas. Publica una semana arriba." />}
        <div className="grid gap-4">
          {semanas.map((lun) => {
            const bs = B.filter((b) => lunesDe(b.fecha) === lun);
            const fechas = Array.from(new Set(bs.map((b) => b.fecha))).sort();
            return (
              <div key={lun} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-extrabold text-ink">Semana del {new Date(lun + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long" })}</div>
                  <span className="text-xs text-muted">{bs.filter((b) => b.estado === "publicado").length} clases · {bs.reduce((s, b) => s + Number(b.inscritos), 0)} inscritos</span>
                </div>
                {fechas.map((f) => (
                  <div key={f} className="mb-3 last:mb-0">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted mb-1">{fechaLarga(f)}</div>
                    <div className="table-wrap"><table className="table min-w-[520px]">
                      <tbody>
                        {bs.filter((b) => b.fecha === f).map((b) => (
                          <tr key={b.id} className={b.estado === "cancelado" ? "opacity-50 line-through" : ""}>
                            <td className="font-mono">{h(b.hora_inicio)}–{h(b.hora_fin)}</td>
                            <td>{nCancha(b.cancha_id)}</td>
                            <td>{nNivel(b.nivel_id)}</td>
                            <td>{b.tipo === "grupal" ? "Grupal" : "Personal."}</td>
                            <td>{nEnt(b.entrenador_id)}</td>
                            <td><span className={Number(b.inscritos) >= b.cupo ? "pill-ok" : "pill-off"}>{b.inscritos}/{b.cupo}</span></td>
                            <td className="text-right">
                              {b.estado === "publicado" ? (
                                <form action={cancelarBloque} className="inline-flex items-center gap-1">
                                  <input type="hidden" name="id" value={b.id} />
                                  <input name="motivo" className="input !py-1 !text-xs w-36" placeholder="Motivo" />
                                  <button className="text-xs underline text-danger">Cancelar</button>
                                </form>
                              ) : <span className="text-xs text-muted no-underline">Cancelada{b.motivo_cancelacion ? `: ${b.motivo_cancelacion}` : ""}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
