import { createClient } from "@/lib/supabase/server";
import { PageHeader, Aviso, DIAS } from "@/components/ui";
import { guardarParametros } from "./actions";

type Param = { clave: string; valor: string; descripcion: string; actualizado_en: string };

const GRUPOS: { titulo: string; claves: string[] }[] = [
  { titulo: "Bloques y cupos", claves: ["bloque_duracion_min", "cupo_grupal", "personalizada_alumnos", "bloques_multinivel", "publicacion_dia", "publicacion_hora"] },
  { titulo: "Mensualidad grupal", claves: ["vigencia_mensualidad_dias", "tope_grupales_semana"] },
  { titulo: "Paquete personalizado", claves: ["paquete_sesiones", "paquete_vigencia_dias", "paquete_inicio", "cancelacion_horas", "extension_maxima_dias"] },
  { titulo: "Avisos y gracia", claves: ["aviso_por_vencer_dias", "aviso_por_vencer_sesiones", "dias_gracia", "lista_espera_horas"] },
];

function Campo({ p }: { p: Param }) {
  const id = `p_${p.clave}`;
  let control: React.ReactNode;
  if (p.clave === "bloques_multinivel") {
    control = (
      <select id={id} name={id} className="input" defaultValue={p.valor}>
        <option value="false">Desactivado</option><option value="true">Activado</option>
      </select>
    );
  } else if (p.clave === "paquete_inicio") {
    control = (
      <select id={id} name={id} className="input" defaultValue={p.valor}>
        <option value="pago">Fecha del pago</option><option value="primera_clase">Primera clase usada</option>
      </select>
    );
  } else if (p.clave === "publicacion_dia") {
    control = (
      <select id={id} name={id} className="input" defaultValue={p.valor}>
        {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
      </select>
    );
  } else if (p.clave === "publicacion_hora") {
    control = <input id={id} name={id} type="time" className="input" defaultValue={p.valor} />;
  } else {
    control = <input id={id} name={id} type="number" min={0} className="input" defaultValue={p.valor} />;
  }
  return (
    <div>
      <label className="label" htmlFor={id}>{p.descripcion}</label>
      {control}
    </div>
  );
}

export default async function ParametrosPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("parametros").select("*");
  const params = new Map(((data ?? []) as Param[]).map((p) => [p.clave, p]));

  return (
    <>
      <PageHeader
        title="Parámetros de la academia"
        subtitle="Las reglas numéricas no van fijas en el código. Cada cambio queda con fecha y usuario, y aplica a inscripciones y pagos nuevos; los existentes no se alteran."
      />
      <Aviso ok={ok} error={error} />
      <form action={guardarParametros} className="grid gap-4">
        {GRUPOS.map((g) => (
          <section key={g.titulo} className="card">
            <h2 className="text-sm font-bold text-ink mb-3">{g.titulo}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.claves.map((k) => params.get(k) && <Campo key={k} p={params.get(k)!} />)}
            </div>
          </section>
        ))}
        <div className="flex justify-end"><button className="btn-primary">Guardar parámetros</button></div>
      </form>
    </>
  );
}
