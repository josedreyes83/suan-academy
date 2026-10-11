import { createClient } from "@/infrastructure/supabase/server";
import { PageHeader, Aviso, Vacio } from "@/components/ui";
import { crearNivel, actualizarNivel, cambiarEstadoNivel } from "./actions";

type Nivel = { id: number; nombre: string; orden: number; descripcion: string | null; edad_min: number | null; edad_max: number | null; activo: boolean };

function CamposNivel({ n }: { n?: Nivel }) {
  const k = n?.id ?? "nuevo";
  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
      <div>
        <label className="label" htmlFor={`nombre_${k}`}>Nombre</label>
        <input id={`nombre_${k}`} name="nombre" className="input" defaultValue={n?.nombre ?? ""} required />
      </div>
      <div>
        <label className="label" htmlFor={`orden_${k}`}>Orden</label>
        <input id={`orden_${k}`} name="orden" type="number" min={1} className="input" defaultValue={n?.orden ?? ""} required />
      </div>
      <div>
        <label className="label" htmlFor={`emin_${k}`}>Edad mín.</label>
        <input id={`emin_${k}`} name="edad_min" type="number" min={3} className="input" defaultValue={n?.edad_min ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor={`emax_${k}`}>Edad máx.</label>
        <input id={`emax_${k}`} name="edad_max" type="number" min={3} className="input" defaultValue={n?.edad_max ?? ""} />
      </div>
      <div className="sm:col-span-4">
        <label className="label" htmlFor={`desc_${k}`}>Descripción (se muestra en el link de registro)</label>
        <input id={`desc_${k}`} name="descripcion" className="input" defaultValue={n?.descripcion ?? ""} />
      </div>
    </div>
  );
}

export default async function NivelesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("niveles").select("*").order("orden");
  const niveles = (data ?? []) as Nivel[];

  return (
    <>
      <PageHeader
        title="Niveles"
        subtitle="El orden define cómo se listan y permite subir de nivel. La descripción ayuda al alumno nuevo a escoger bien; la edad solo orienta."
      />
      <Aviso ok={ok} error={error} />

      <form action={crearNivel} className="card mb-6">
        <div className="text-sm font-bold text-ink mb-3">Nuevo nivel</div>
        <CamposNivel />
        <div className="mt-3 flex justify-end"><button className="btn-primary">Agregar nivel</button></div>
      </form>

      {niveles.length === 0 && <Vacio texto="Aún no hay niveles." />}

      <div className="grid gap-3">
        {niveles.map((n) => (
          <details key={n.id} className={`card ${n.activo ? "" : "opacity-70"}`}>
            <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-md bg-ink text-lime font-extrabold grid place-items-center">{n.orden}</span>
                <span className="text-lg font-extrabold text-ink">{n.nombre}</span>
                <span className={n.activo ? "pill-ok" : "pill-off"}>{n.activo ? "Activo" : "Inactivo"}</span>
              </div>
              <span className="text-xs text-muted">{n.descripcion}</span>
            </summary>
            <form action={actualizarNivel} className="mt-4">
              <input type="hidden" name="id" value={n.id} />
              <CamposNivel n={n} />
              <div className="mt-3 flex justify-end"><button className="btn-dark">Guardar cambios</button></div>
            </form>
            <form action={cambiarEstadoNivel} className="mt-2 flex justify-end">
              <input type="hidden" name="id" value={n.id} />
              <input type="hidden" name="activo" value={n.activo ? "false" : "true"} />
              <button className={n.activo ? "btn-danger" : "btn-ghost"}>{n.activo ? "Desactivar" : "Activar"}</button>
            </form>
          </details>
        ))}
      </div>
    </>
  );
}
