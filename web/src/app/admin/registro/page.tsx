import { createClient } from "@/infrastructure/supabase/server";
import { PageHeader, Aviso } from "@/components/ui";
import { cambiarRegistroHabilitado, crearLink, cambiarEstadoLink } from "./actions";
import { CopiarLink } from "./CopiarLink";

type Nivel = { id: number; nombre: string };
type Link = { id: string; codigo: string; nombre_origen: string; nivel_id: number | null; vence_en: string | null; limite: number | null; activo: boolean; registros_recibidos: number };
export default async function RegistroAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: param }, { data: links }, { data: niveles }] = await Promise.all([
    supabase.from("parametros").select("valor").eq("clave", "registro_habilitado").maybeSingle(),
    supabase.from("v_links_registro").select("*").order("creado_en"),
    supabase.from("niveles").select("id, nombre").eq("activo", true).order("orden"),
  ]);
  const habilitado = param?.valor === "true";
  const L = (links ?? []) as Link[];
  const N = (niveles ?? []) as Nivel[];
  const nombreNivel = (id: number | null) => N.find((n) => n.id === id)?.nombre ?? "—";

  return (
    <>
      <PageHeader
        title="Links de registro"
        subtitle="Habilita la sección de registro y crea links para compartir (uno por campaña u origen). Los registros que lleguen aparecen en Alumnos → Pendientes de aprobación."
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
        <div className="card table-wrap mb-3">
          <table className="table min-w-[640px]">
            <thead><tr><th>Origen</th><th>Link</th><th>Nivel</th><th>Vence</th><th>Límite</th><th>Recibidos</th><th></th></tr></thead>
            <tbody>
              {L.map((l) => (
                <tr key={l.id} className={l.activo ? "" : "opacity-60"}>
                  <td className="font-medium">{l.nombre_origen}{!l.activo && <span className="pill-off ml-2">Pausado</span>}</td>
                  <td><CopiarLink ruta={`/registro/${l.codigo}`} /></td>
                  <td>{l.nivel_id ? nombreNivel(l.nivel_id) : "Lo define el admin"}</td>
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
              <label className="label" htmlFor="nivel_id">Nivel sugerido (opcional)</label>
              <select id="nivel_id" name="nivel_id" className="input" defaultValue=""><option value="">Lo define el admin al activar</option>{N.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select>
            </div>
            <div><label className="label" htmlFor="vence_en">Vence (opcional)</label><input id="vence_en" name="vence_en" type="date" className="input" /></div>
            <div><label className="label" htmlFor="limite">Límite de registros (opcional)</label><input id="limite" name="limite" type="number" min={1} className="input" /></div>
            <div className="lg:col-span-5 flex justify-end"><button className="btn-dark">Crear link</button></div>
          </form>
        </details>
      </section>

    </>
  );
}
