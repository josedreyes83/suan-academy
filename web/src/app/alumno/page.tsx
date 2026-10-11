import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Aviso, Vacio } from "@/components/ui";
import { alumnoActual, catalogos, h, fechaLarga, hoyISO, type Inscripcion, type Vigencia } from "./lib";
import { cancelarReserva } from "./actions";

const ESTADO: Record<string, { texto: string; clase: string }> = {
  al_dia: { texto: "Al día", clase: "pill-ok" },
  por_vencer: { texto: "Por vencer", clase: "pill bg-amber-200 text-ink" },
  vencido: { texto: "Vencido", clase: "pill bg-danger/15 text-danger" },
};

export default async function MisClases({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const alumno = await alumnoActual();
  if (!alumno) {
    return (
      <div className="card text-center py-10">
        <h1 className="text-xl font-extrabold text-ink">Tu cuenta aún no está vinculada a un alumno aprobado</h1>
        <p className="text-muted mt-2 text-sm">Escríbenos por WhatsApp para que la academia revise tu registro.</p>
      </div>
    );
  }
  const supabase = await createClient();
  const hoy = hoyISO();
  const [{ data: insc }, { data: vig }, cat] = await Promise.all([
    supabase.from("inscripciones").select("id, bloque_id, estado, motivo, sesion_descontada, bloques(*)").eq("alumno_id", alumno.id).in("estado", ["inscrito", "cancelado_academia"]),
    supabase.from("v_vigencias").select("*").eq("alumno_id", alumno.id).neq("estado", "vencido").order("vigencia_fin"),
    catalogos(),
  ]);
  const todas = ((insc ?? []) as unknown as Inscripcion[]).filter((i) => i.bloques && i.bloques.fecha >= hoy);
  const { data: cupos } = await supabase.from("v_bloques_cupo").select("id, inscritos").in("id", todas.map((i) => i.bloque_id));
  for (const i of todas) i.bloques!.inscritos = (cupos ?? []).find((c) => c.id === i.bloque_id)?.inscritos ?? 0;
  const I = todas.sort((a, b) => (a.bloques!.fecha + a.bloques!.hora_inicio).localeCompare(b.bloques!.fecha + b.bloques!.hora_inicio));
  const V = (vig ?? []) as Vigencia[];
  const ahora = new Date();

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">Hola, {alumno.nombres}</h1>
        <p className="text-muted text-sm">Nivel {alumno.niveles?.nombre ?? "—"}. Aquí ves tus clases reservadas; en «Escoger clase» reservas nuevas.</p>
      </div>
      <Aviso ok={ok} error={error} />

      {/* Vigencias */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        {V.length === 0 && (
          <div className="card sm:col-span-2 flex items-center justify-between gap-3">
            <div><div className="font-bold text-ink">Sin plan registrado</div><div className="text-sm text-muted">Cuando pagues tu mensualidad o paquete, la academia lo registra y aparece aquí.</div></div>
          </div>
        )}
        {V.map((v) => (
          <div key={v.pago_id} className="card">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold tracking-widest text-muted uppercase">{v.clase === "grupal" ? "Clases grupales" : "Clases personalizadas"}</div>
              <span className={ESTADO[v.estado]?.clase ?? "pill-off"}>{ESTADO[v.estado]?.texto ?? v.estado}</span>
            </div>
            <div className="text-lg font-extrabold text-ink mt-1">{v.tipo_producto === "mensualidad_grupal" ? "Mensualidad" : v.tipo_producto === "paquete_personalizado" ? "Paquete" : "Sesión única"}</div>
            <div className="text-sm text-muted">Vence el {new Date(v.vigencia_fin + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long" })}{v.sesiones_totales ? ` · ${v.sesiones_totales - v.sesiones_usadas} de ${v.sesiones_totales} sesiones disponibles` : ""}</div>
          </div>
        ))}
      </section>

      {/* Reservas */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-ink">Mis clases reservadas ({I.filter((i) => i.estado === "inscrito").length})</h2>
          <Link href="/alumno/clases" className="btn-primary !py-1.5 !px-3 text-sm">Escoger clase</Link>
        </div>
        {I.length === 0 && <div className="card"><Vacio texto="Todavía no tienes clases reservadas." /><div className="text-center pb-4"><Link href="/alumno/clases" className="btn-dark">Ver clases de mi nivel</Link></div></div>}
        <div className="grid gap-3">
          {I.map((i) => {
            const b = i.bloques!;
            const inicio = new Date(`${b.fecha}T${b.hora_inicio}`);
            const cancelada = i.estado === "cancelado_academia" || b.estado === "cancelado";
            return (
              <div key={i.id} className={`card flex flex-wrap items-center justify-between gap-3 ${cancelada ? "opacity-70 border-danger/30" : "border-l-4 border-l-lime"}`}>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted">{fechaLarga(b.fecha)}</div>
                  <div className="text-xl font-extrabold text-ink">{h(b.hora_inicio)}–{h(b.hora_fin)} <span className="text-base font-semibold text-muted">· {cat.nCancha(b.cancha_id)}</span></div>
                  <div className="text-sm text-muted">{b.tipo === "grupal" ? "Grupal" : "Personalizada"} · {cat.nEnt(b.entrenador_id)} · {b.inscritos}/{b.cupo} inscritos</div>
                  {cancelada && <div className="text-sm text-danger font-semibold mt-1">Cancelada por la academia{b.motivo_cancelacion ? `: ${b.motivo_cancelacion}` : ""}</div>}
                </div>
                {!cancelada && inicio > ahora && (
                  <form action={cancelarReserva}>
                    <input type="hidden" name="inscripcion_id" value={i.id} />
                    <button className="btn-ghost text-sm">Cancelar reserva</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
