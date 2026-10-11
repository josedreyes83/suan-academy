import { createClient } from "@/infrastructure/supabase/server";
import { PageHeader, Aviso, formatoCOP } from "@/components/ui";
import { registrarPrecio } from "./actions";

type Producto = { id: number; codigo: string; nombre: string; tipo: string; clase: string };
type Tipo = { id: number; nombre: string; activo: boolean };
type Nivel = { id: number; nombre: string };
type Precio = { id: number; producto_id: number; tipo_alumno_id: number; nivel_id: number | null; valor: number; vigente_desde: string; creado_en: string };

const VIGENCIA: Record<string, string> = {
  mensualidad_grupal: "30 días desde la fecha de inicio",
  paquete_personalizado: "10 sesiones o 45 días",
  sesion_unica: "La fecha de la clase",
};

export default async function PreciosPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const [{ data: productos }, { data: tipos }, { data: niveles }, { data: precios }] = await Promise.all([
    supabase.from("productos").select("*").eq("activo", true).order("id"),
    supabase.from("tipos_alumno").select("id, nombre, activo").order("id"),
    supabase.from("niveles").select("id, nombre").eq("activo", true).order("orden"),
    supabase.from("precios").select("*").lte("vigente_desde", hoy).order("vigente_desde", { ascending: false }).order("creado_en", { ascending: false }),
  ]);

  const P = (productos ?? []) as Producto[];
  const T = ((tipos ?? []) as Tipo[]).filter((t) => t.activo);
  const N = (niveles ?? []) as Nivel[];
  const PR = (precios ?? []) as Precio[];

  // Precio vigente general (sin nivel) por producto y tipo
  function vigente(productoId: number, tipoId: number) {
    return PR.find((p) => p.producto_id === productoId && p.tipo_alumno_id === tipoId && p.nivel_id === null) ?? null;
  }
  const faltantes = P.flatMap((p) => T.filter((t) => !vigente(p.id, t.id)).map((t) => `${p.nombre} · ${t.nombre}`));

  return (
    <>
      <PageHeader
        title="Lista de precios"
        subtitle="Un precio por cada producto y tipo de alumno. Al registrar un precio nuevo, el anterior queda en historial y los pagos ya hechos no cambian. Sin precio vigente no se puede registrar un pago."
      />
      <Aviso ok={ok} error={error} />
      {faltantes.length > 0 && (
        <div className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-sm">
          <b className="text-ink">Faltan {faltantes.length} precios:</b> <span className="text-muted">{faltantes.join(", ")}</span>
        </div>
      )}

      <div className="card mb-6 table-wrap">
        <table className="table min-w-[560px]">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Vigencia</th>
              {T.map((t) => <th key={t.id}>Precio {t.nombre}</th>)}
            </tr>
          </thead>
          <tbody>
            {P.map((p) => (
              <tr key={p.id}>
                <td className="font-semibold text-ink">{p.nombre}<div className="text-xs text-muted font-normal">{p.clase}</div></td>
                <td className="text-muted">{VIGENCIA[p.tipo]}</td>
                {T.map((t) => {
                  const v = vigente(p.id, t.id);
                  return (
                    <td key={t.id}>
                      {v ? (
                        <><span className="font-bold text-ink">{formatoCOP(v.valor)}</span><div className="text-xs text-muted">desde {v.vigente_desde}</div></>
                      ) : (
                        <span className="pill-off">Sin precio</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={registrarPrecio} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <div className="lg:col-span-5 text-sm font-bold text-ink">Registrar precio</div>
        <div>
          <label className="label" htmlFor="producto_id">Producto</label>
          <select id="producto_id" name="producto_id" className="input" required>
            {P.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tipo_alumno_id">Tipo de alumno</label>
          <select id="tipo_alumno_id" name="tipo_alumno_id" className="input" required>
            {T.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="nivel_id">Nivel (opcional)</label>
          <select id="nivel_id" name="nivel_id" className="input" defaultValue="">
            <option value="">Todos los niveles</option>
            {N.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="valor">Valor (COP)</label>
          <input id="valor" name="valor" inputMode="numeric" className="input" placeholder="180000" required />
        </div>
        <div>
          <label className="label" htmlFor="vigente_desde">Vigente desde</label>
          <input id="vigente_desde" name="vigente_desde" type="date" className="input" defaultValue={hoy} />
        </div>
        <div className="lg:col-span-5 flex justify-end"><button className="btn-primary">Guardar precio</button></div>
      </form>

      {PR.length > 0 && (
        <details className="mt-6">
          <summary className="text-sm text-muted cursor-pointer">Historial de precios ({PR.length})</summary>
          <div className="card mt-2 table-wrap">
            <table className="table min-w-[520px]">
              <thead><tr><th>Producto</th><th>Tipo</th><th>Nivel</th><th>Valor</th><th>Vigente desde</th></tr></thead>
              <tbody>
                {PR.map((p) => (
                  <tr key={p.id}>
                    <td>{P.find((x) => x.id === p.producto_id)?.nombre}</td>
                    <td>{T.find((x) => x.id === p.tipo_alumno_id)?.nombre ?? p.tipo_alumno_id}</td>
                    <td>{p.nivel_id ? N.find((x) => x.id === p.nivel_id)?.nombre : "Todos"}</td>
                    <td>{formatoCOP(p.valor)}</td>
                    <td>{p.vigente_desde}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </>
  );
}
