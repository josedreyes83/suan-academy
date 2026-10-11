import Link from "next/link";
import { createClient } from "@/infrastructure/supabase/server";
import { PageHeader, Aviso, Vacio } from "@/components/ui";
import { PARQ, edadDesde } from "@/domain/registro";
import { cambiarNivelTipo, cambiarEstadoAlumno, restablecerClave } from "./actions";

type Nivel = { id: number; nombre: string };
type Tipo = { id: number; nombre: string };
type Alumno = {
  id: string; nombres: string; apellidos: string; fecha_nacimiento: string; tipo_documento: string; numero_documento: string;
  celular: string; correo: string | null; nivel_id: number | null; tipo_alumno_id: number | null; estado_registro: string;
  creado_en: string; aprobado_en: string | null; motivo_rechazo: string | null; perfil_id: string | null;
  parq: Record<string, boolean> | null; parq_alerta: boolean; parq_observaciones: string | null;
  alumno_acudientes: { parentesco: string | null; acudientes: { nombres: string; apellidos: string; celular: string } | null }[];
};

const FILTROS = [
  { v: "aprobado", label: "Activos" },
  { v: "pendiente", label: "Pendientes" },
  { v: "inactivo", label: "Inactivos" },
  { v: "rechazado", label: "Rechazados" },
  { v: "todos", label: "Todos" },
];
const ESTADO: Record<string, { label: string; cls: string }> = {
  aprobado: { label: "Activo", cls: "pill-ok" },
  pendiente: { label: "Pendiente", cls: "pill bg-lime/30 text-ink" },
  inactivo: { label: "Inactivo", cls: "pill-off" },
  rechazado: { label: "Rechazado", cls: "pill bg-danger/15 text-danger" },
};
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—");
const wa = (cel: string) => `https://wa.me/57${cel.replace(/\D/g, "").replace(/^57/, "")}`;

export default async function AlumnosPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; estado?: string; q?: string }> }) {
  const { ok, error, estado = "aprobado", q = "" } = await searchParams;
  const supabase = await createClient();
  let consulta = supabase.from("alumnos").select("*, alumno_acudientes(parentesco, acudientes(nombres, apellidos, celular))").order("apellidos").order("nombres");
  if (estado !== "todos") consulta = consulta.eq("estado_registro", estado);
  const [{ data: alumnos }, { data: niveles }, { data: tipos }, { data: conteos }] = await Promise.all([
    consulta,
    supabase.from("niveles").select("id, nombre").order("orden"),
    supabase.from("tipos_alumno").select("id, nombre").order("id"),
    supabase.from("alumnos").select("estado_registro"),
  ]);
  const N = (niveles ?? []) as Nivel[];
  const T = (tipos ?? []) as Tipo[];
  const busca = q.trim().toLowerCase();
  const A = ((alumnos ?? []) as unknown as Alumno[]).filter((a) =>
    !busca || `${a.nombres} ${a.apellidos} ${a.numero_documento} ${a.correo ?? ""} ${a.celular}`.toLowerCase().includes(busca)
  );
  const total = (conteos ?? []).reduce<Record<string, number>>((acc, r) => { acc[r.estado_registro] = (acc[r.estado_registro] ?? 0) + 1; acc.todos = (acc.todos ?? 0) + 1; return acc; }, {});
  const nNivel = (id: number | null) => N.find((n) => n.id === id)?.nombre ?? "—";
  const nTipo = (id: number | null) => T.find((t) => t.id === id)?.nombre ?? "—";

  return (
    <>
      <PageHeader title="Alumnos" subtitle="Todos los registrados en la academia. Cambia nivel o tipo, inactiva a quien se retira o restablece la clave de acceso." />
      <Aviso ok={ok} error={error} />

      {/* Filtros por estado + búsqueda */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTROS.map((f) => (
          <Link key={f.v} href={`/admin/alumnos?estado=${f.v}${busca ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold border transition-colors ${estado === f.v ? "bg-ink text-white border-ink" : "bg-surface text-muted border-line hover:text-fg"}`}>
            {f.label} <span className="opacity-70">{total[f.v] ?? 0}</span>
          </Link>
        ))}
        <form className="ml-auto flex gap-2 w-full sm:w-auto">
          <input type="hidden" name="estado" value={estado} />
          <input name="q" defaultValue={q} placeholder="Buscar por nombre, documento, correo…" className="input sm:w-72" />
          <button className="btn-ghost shrink-0">Buscar</button>
        </form>
      </div>

      {A.length === 0 ? <Vacio texto={busca ? "Ningún alumno coincide con la búsqueda." : "No hay alumnos en este estado."} /> : (
        <div className="grid gap-3">
          {A.map((a) => {
            const e = ESTADO[a.estado_registro] ?? ESTADO.inactivo;
            const siSi = PARQ.filter((p) => a.parq?.[p.id]);
            const acud = a.alumno_acudientes?.[0];
            const edad = edadDesde(a.fecha_nacimiento);
            return (
              <details key={a.id} className="card group">
                <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-2 -m-1 p-1">
                  <div className="min-w-0">
                    <div className="font-bold text-ink truncate">{a.apellidos}, {a.nombres}</div>
                    <div className="text-xs text-muted">{edad ?? "?"} años · {a.tipo_documento} {a.numero_documento} · {nNivel(a.nivel_id)} · {nTipo(a.tipo_alumno_id)}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {a.parq_alerta && <span className="pill bg-danger/15 text-danger">Salud: {siSi.length} sí</span>}
                    <span className={e.cls}>{e.label}</span>
                    <span className="text-muted group-open:rotate-180 transition-transform" aria-hidden>▾</span>
                  </div>
                </summary>

                <div className="mt-4 grid gap-4 lg:grid-cols-2 text-sm">
                  <div className="grid gap-1">
                    <div><span className="text-muted">Celular:</span> <a className="underline" href={wa(a.celular)} target="_blank" rel="noreferrer">{a.celular}</a></div>
                    <div><span className="text-muted">Correo (usuario):</span> {a.correo ?? "—"}</div>
                    <div><span className="text-muted">Registrado:</span> {fecha(a.creado_en)}{a.aprobado_en && <> · <span className="text-muted">activado:</span> {fecha(a.aprobado_en)}</>}</div>
                    {acud?.acudientes && <div><span className="text-muted">Acudiente ({acud.parentesco ?? "—"}):</span> {acud.acudientes.nombres} {acud.acudientes.apellidos} · <a className="underline" href={wa(acud.acudientes.celular)} target="_blank" rel="noreferrer">{acud.acudientes.celular}</a></div>}
                    {a.motivo_rechazo && <div><span className="text-muted">Motivo de rechazo:</span> {a.motivo_rechazo}</div>}
                    {siSi.length > 0 && (
                      <div className="mt-1 rounded-md border border-danger/30 bg-danger/5 p-2">
                        <div className="font-semibold text-danger text-xs mb-1">Cuestionario de salud: respondió «Sí» a</div>
                        <ul className="list-disc pl-4 text-xs">{siSi.map((p) => <li key={p.id}>{p.texto}</li>)}</ul>
                        {a.parq_observaciones && <p className="text-xs mt-1">Observaciones: {a.parq_observaciones}</p>}
                      </div>
                    )}
                  </div>

                  {(a.estado_registro === "aprobado" || a.estado_registro === "inactivo") && (
                    <div className="grid gap-3">
                      <form action={cambiarNivelTipo} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                        <input type="hidden" name="id" value={a.id} /><input type="hidden" name="filtro" value={estado} />
                        <div><label className="label">Nivel</label><select name="nivel_id" className="input" defaultValue={a.nivel_id ?? ""}>{N.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select></div>
                        <div><label className="label">Tipo</label><select name="tipo_alumno_id" className="input" defaultValue={a.tipo_alumno_id ?? ""}>{T.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
                        <button className="btn-ghost">Guardar</button>
                      </form>
                      <div className="flex flex-wrap gap-2">
                        <form action={restablecerClave}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="filtro" value={estado} /><button className="btn-ghost">Restablecer clave</button></form>
                        <form action={cambiarEstadoAlumno}>
                          <input type="hidden" name="id" value={a.id} /><input type="hidden" name="filtro" value={estado} />
                          <input type="hidden" name="activo" value={a.estado_registro === "aprobado" ? "false" : "true"} />
                          <button className={a.estado_registro === "aprobado" ? "btn-danger" : "btn-primary"}>{a.estado_registro === "aprobado" ? "Inactivar" : "Reactivar"}</button>
                        </form>
                      </div>
                    </div>
                  )}
                  {a.estado_registro === "pendiente" && (
                    <div className="text-sm text-muted self-start">Este registro está pendiente: actívalo desde <Link className="underline" href="/admin/registro">Registro de alumnos</Link>.</div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
