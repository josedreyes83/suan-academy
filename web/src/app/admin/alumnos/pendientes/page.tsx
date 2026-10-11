import { createClient } from "@/infrastructure/supabase/server";
import { PageHeader, Aviso, Vacio } from "@/components/ui";
import { PARQ } from "@/domain/registro";
import { aprobarAlumno, rechazarAlumno } from "../../registro/actions";

type Nivel = { id: number; nombre: string };
type Tipo = { id: number; nombre: string; codigo: string };
type Link = { id: string; nombre_origen: string };
type Pendiente = {
  id: string; nombres: string; apellidos: string; fecha_nacimiento: string; tipo_documento: string; numero_documento: string;
  celular: string; correo: string | null; nivel_id: number | null; link_id: string | null; creado_en: string;
  parq: Record<string, boolean> | null; parq_alerta: boolean; parq_observaciones: string | null;
  alumno_acudientes: { parentesco: string | null; acudientes: { nombres: string; apellidos: string; celular: string } | null }[];
};

const edad = (f: string) => Math.floor((Date.now() - new Date(f).getTime()) / (365.25 * 24 * 3600 * 1000));

export default async function PendientesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: links }, { data: niveles }, { data: tipos }, { data: pend }, { count: aprobados }, { count: rechazados }] = await Promise.all([
    supabase.from("links_registro").select("id, nombre_origen"),
    supabase.from("niveles").select("id, nombre").eq("activo", true).order("orden"),
    supabase.from("tipos_alumno").select("id, nombre, codigo").eq("activo", true).order("id"),
    supabase.from("alumnos").select("*, alumno_acudientes(parentesco, acudientes(nombres, apellidos, celular))").eq("estado_registro", "pendiente").order("creado_en"),
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado_registro", "aprobado"),
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado_registro", "rechazado"),
  ]);
  const L = (links ?? []) as Link[];
  const N = (niveles ?? []) as Nivel[];
  const T = (tipos ?? []) as Tipo[];
  const P = (pend ?? []) as unknown as Pendiente[];
  const nombreNivel = (id: number | null) => N.find((n) => n.id === id)?.nombre ?? "—";
  const origen = (id: string | null) => L.find((l) => l.id === id)?.nombre_origen ?? "—";
  const sinClave = !process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    <>
      <PageHeader
        title="Pendientes de aprobación"
        subtitle="Revisa cada registro, escoge nivel y tipo de alumno y actívalo: la app crea su cuenta (usuario = su correo, clave = su número de documento)."
      />
      <Aviso ok={ok} error={error} />
      {/* Pendientes */}
      <section>
        <div className="flex items-end justify-between mb-2">
          <h2 className="text-sm font-bold text-ink">{P.length} por revisar</h2>
          <span className="text-xs text-muted">{aprobados ?? 0} aprobados · {rechazados ?? 0} rechazados</span>
        </div>
        {sinClave && <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">Para aprobar alumnos se necesita <code>SUPABASE_SERVICE_ROLE_KEY</code> en las variables del servidor.</div>}
        {P.length === 0 && <Vacio texto="No hay registros pendientes." />}
        <div className="grid gap-3">
          {P.map((a) => {
            const ac = a.alumno_acudientes?.[0];
            const siSi = PARQ.filter((q) => a.parq?.[q.id]);
            return (
              <details key={a.id} className={`card ${a.parq_alerta ? "border-danger/40" : ""}`}>
                <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer list-none">
                  <div>
                    <span className="text-lg font-extrabold text-ink">{a.nombres} {a.apellidos}</span>
                    <span className="text-sm text-muted ml-2">{edad(a.fecha_nacimiento)} años · {a.tipo_documento} {a.numero_documento} · {a.celular}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {a.nivel_id && <span className="pill-off">Sugerido: {nombreNivel(a.nivel_id)}</span>}
                    <span className="pill-off">{origen(a.link_id)}</span>
                    <span className="pill bg-lime/30 text-ink">Pendiente de aprobación</span>
                    {a.parq_alerta ? <span className="pill bg-danger/15 text-danger">Salud: {siSi.length} sí</span> : <span className="pill-ok">Salud sin alertas</span>}
                  </div>
                </summary>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="text-sm space-y-1">
                    <div><b>Registrado:</b> {new Date(a.creado_en).toLocaleString("es-CO")}</div>
                    <div><b>Correo:</b> {a.correo ?? "no registró"}</div>
                    {ac?.acudientes && <div><b>Acudiente:</b> {ac.acudientes.nombres} {ac.acudientes.apellidos} ({ac.parentesco}) · {ac.acudientes.celular}</div>}
                    {siSi.length > 0 && (
                      <div className="rounded-md bg-danger/10 border border-danger/30 p-3 mt-2">
                        <b className="text-danger">Respondió «Sí» a:</b>
                        <ul className="list-disc pl-5 mt-1">{siSi.map((q) => <li key={q.id}>{q.texto}</li>)}</ul>
                        {a.parq_observaciones && <div className="mt-1 text-muted">Observación: {a.parq_observaciones}</div>}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3">
                    <form action={aprobarAlumno} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
                      <input type="hidden" name="id" value={a.id} />
                      <div>
                        <label className="label">Nivel <span className="text-danger">*</span></label>
                        <select name="nivel_id" className="input" defaultValue={a.nivel_id ?? ""} required>
                          <option value="" disabled>Escoge el nivel</option>
                          {N.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                        </select>
                        {a.nivel_id && <p className="text-xs text-muted mt-1">Nivel sugerido por el link: {nombreNivel(a.nivel_id)}; confírmalo o cámbialo.</p>}
                      </div>
                      <div>
                        <label className="label">Tipo de alumno <span className="text-danger">*</span></label>
                        <select name="tipo_alumno_id" className="input" defaultValue="" required>
                          <option value="" disabled>Escoge el tipo</option>
                          {T.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                      </div>
                      <button className="btn-primary" disabled={sinClave}>Activar</button>
                    </form>
                    <form action={rechazarAlumno} className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                      <input type="hidden" name="id" value={a.id} />
                      <div><label className="label">Motivo de rechazo</label><input name="motivo" className="input" placeholder="Ej. datos incompletos" /></div>
                      <button className="btn-danger">Rechazar</button>
                    </form>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </>
  );
}
