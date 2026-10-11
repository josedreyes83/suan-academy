import { createClient } from "@/infrastructure/supabase/server";

export type Alumno = { id: string; nombres: string; nivel_id: number | null; tipo_alumno_id: number | null; estado_registro: string; niveles: { nombre: string } | null };
export type Vigencia = { pago_id: string; clase: string; tipo_producto: string; vigencia_inicio: string; vigencia_fin: string; sesiones_totales: number | null; sesiones_usadas: number; estado: string };
export type Bloque = { id: string; fecha: string; cancha_id: number; hora_inicio: string; hora_fin: string; nivel_id: number; tipo: string; entrenador_id: string; cupo: number; estado: string; inscritos: number; motivo_cancelacion: string | null };
export type Inscripcion = { id: string; bloque_id: string; estado: string; motivo: string | null; sesion_descontada: boolean; bloques: Bloque | null };

export const h = (t: string) => t.slice(0, 5);
export const fechaLarga = (f: string) => new Date(f + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
export const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Alumno vinculado al usuario actual (aprobado). */
export async function alumnoActual() {
  const supabase = await createClient();
  const { data } = await supabase.from("alumnos").select("id, nombres, nivel_id, tipo_alumno_id, estado_registro, niveles(nombre)").eq("estado_registro", "aprobado").limit(1).maybeSingle();
  return (data ?? null) as unknown as Alumno | null;
}

export async function catalogos() {
  const supabase = await createClient();
  const [{ data: canchas }, { data: ent }] = await Promise.all([
    supabase.from("canchas").select("id, nombre"),
    supabase.from("entrenadores").select("perfil_id, perfiles(nombres, apellidos)"),
  ]);
  const C = (canchas ?? []) as { id: number; nombre: string }[];
  const E = (ent ?? []) as unknown as { perfil_id: string; perfiles: { nombres: string; apellidos: string } | null }[];
  return {
    nCancha: (id: number) => C.find((c) => c.id === id)?.nombre ?? "Cancha",
    nEnt: (id: string) => { const e = E.find((x) => x.perfil_id === id); return e?.perfiles ? `${e.perfiles.nombres} ${e.perfiles.apellidos.split(" ")[0]}` : "Entrenador"; },
  };
}
