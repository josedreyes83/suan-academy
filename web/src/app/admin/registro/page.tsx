import { createClient } from "@/lib/supabase/server";
import { PageHeader, Aviso, Vacio } from "@/components/ui";
import { PARQ } from "@/lib/registro";
import { cambiarRegistroHabilitado, crearLink, cambiarEstadoLink, aprobarAlumno, rechazarAlumno } from "./actions";
import { CopiarLink } from "./CopiarLink";

type Nivel = { id: number; nombre: string };
type Tipo = { id: number; nombre: string; codigo: string };
type Link = { id: string; codigo: string; nombre_origen: string; nivel_id: number | null; vence_en: string | null; limite: number | null; activo: boolean; registros_recibidos: number };
type Pendiente = {
  id: string; nombres: string; apellidos: string; fecha_nacimiento: string; tipo_documento: string; numero_documento: string;
  celular: string; correo: string | null; nivel_id: number | null; link_id: string | null; creado_en: string;
  parq: Record<string, boolean> | null; parq_alerta: boolean; parq_observaciones: string | null;
  alumno_acudientes: { parentesco: string | null; acudientes: { nombres: string; apellidos: string; celular: string } | null }[];
};

const edad = (f: string) => Math.floor((Date.now() - new Date(f).getTime()) / (365.25 * 24 * 3600 * 1000));

export default async function RegistroAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: param }, { data: links }, { data: niveles }, { data: tipos }, { data: pend }, { count: aprobados }, { count: rechazados }] = await Promise.all([
    supabase.from("parametros").select("valor").eq("clave", "registro_habilitado").maybeSingle(),
    supabase.from("v_links_registro").select("*").order("creado_en"),
    supabase.from("niveles").select("id, nombre").eq("activo", true).order("orden"),
    supabase.from("tipos_alumno").select("id, nombre, codigo").eq("activo", true).order("id"),
    supabase.from("alumnos").select("*, alumno_acudientes(parentesco, acudientes(nombres, apellidos, celular))").eq("estado_registro", "pendiente").order("creado_en"),
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado_registro", "aprobado"),
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado_registro", "rechazado"),
  ]);
  const habilitado = param?.valor === "true";
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
        title="Registro de alumnos"
        subtitle="Habilita la sección de registro, comparte el link y aprueba los registros pendientes. Al aprobar, la app crea la cuenta del alumno y te muestra su acceso para enviarlo por WhatsApp."
      />
      <Aviso ok={ok} error={error} />

      {/* Estado del registro */}
      <div className={`card mb-6 flex flex-wrap items-center justify-between gap-3 ${habilitado ? "border-lime-dk" : "border-danger/40"}`}>
        <div>
          <div className="text-xs font-bold tracking-widest text-muted uppercase">Sección de registro</div>
          <div className="text-lg font-extrabold text-ink">{habilitado ? "Habilitada: los alumnos nuevos pueden registrarse" : "Deshabilitada: el formulario muestra 'Registro cerrado'"}</div>
        </div>
        <form action={cambiarRegistroHabilitado}>
          <input type="hidden" name="habilitado" value={habilitado ? "false" : "true"} />
          <button className={habilitado ? "btn-danger" : "btn-primary"}>{habilitado ? "Deshabilitar registro" : "Habilitar registro"}</button>
        </form>
      </div>

      {/* Links */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-ink mb-2">Links de registro</h2>
        <div className="card overflow-x-auto mb-3">
          <table className="table min-w-[640px]">
            <thead><tr><th>Origen</th><th>Link</th><th>Nivel</th><th>Vence</th><th>Límite</th><th>Recibidos</th><th></th></tr></thead>
            <tbody>
              {L.map((l) => (
                <tr key={l.id} className={l.activo ? "" : "opacity-60"}>
                  <td className="font-medium">{l.nombre_origen}{!l.activo && <span className="pill-off ml-2">Pausado</span>}</td>
                  <td><CopiarLink ruta={`/registro/${l.codigo}`} /></td>
                  <td>{l.nivel_id ? nombreNivel(l.nivel_id) : "El alumno escoge"}</td>
                  <td>{l.vence_en ?? "—"}</td>
                  <td>{l.limite ?? "—"}</td>
                  <td className="font-bold">{l.registros_recibidos}</td>
                  <td>
                    <form action={cambiarEstadoLink}>
                      <input type="hidden" name="id" value={l.id} /><input type="hidden" name="activo" value={l.activo ? "false" : "true"} />
                      <button className="text-xs underline text-muted hover:text-ink">{l.activo ? "Pausar" : "Reactivar"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="card">
          <summary className="cursor-pointer text-sm font-bold text-ink">Crear link nuevo (campaña, nivel específico)</summary>
          <form action={crearLink} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div><label className="label" htmlFor="nombre_origen">Origen</label><input id="nombre_origen" name="nombre_origen" className="input" placeholder="Instagram octubre" required /></div>
            <div><label className="label" htmlFor="codigo">Código en la URL (opcional)</label><input id="codigo" name="codigo" className="input" placeholder="instagram-oct" /></div>
            <div>
              <label className="label" htmlFor="nivel_id">Nivel fijo (opcional)</label>
              <select id="nivel_id" name="nivel_id" className="input" defaultValue=""><option value="">El alumno escoge</option>{N.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select>
            </div>
            <div><label className="label" htmlFor="vence_en">Vence (opcional)</label><input id="vence_en" name="vence_en" type="date" className="input" /></div>
            <div><label className="label" htmlFor="limite">Límite de registros (opcional)</label><input id="limite" name="limite" type="number" min={1} className="input" /></div>
            <div className="lg:col-span-5 flex justify-end"><button className="btn-dark">Crear link</button></div>
          </form>
        </details>
      </section>

      {/* Pendientes */}
      <section>
        <div className="flex items-end justify-between mb-2">
          <h2 className="text-sm font-bold text-ink">Registros pendientes ({P.length})</h2>
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
                    <span className="pill-off">{nombreNivel(a.nivel_id)}</span>
                    <span className="pill-off">{origen(a.link_id)}</span>
                    {a.parq_alerta ? <span className="pill bg-danger/15 text-danger">PAR-Q: {siSi.length} sí</span> : <span className="pill-ok">PAR-Q sin alertas</span>}
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
                      <div><label className="label">Nivel</label><select name="nivel_id" className="input" defaultValue={a.nivel_id ?? ""} required>{N.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select></div>
                      <div><label className="label">Tipo de alumno</label><select name="tipo_alumno_id" className="input" defaultValue={T.find((t) => t.codigo === "normal")?.id}>{T.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
                      <button className="btn-primary" disabled={sinClave}>Aprobar</button>
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
