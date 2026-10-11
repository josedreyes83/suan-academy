"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/server";
import { requireRol } from "@/infrastructure/sesion";
import { agregarClasesPlantilla } from "@/application/horarios";
import { plantillaRepo } from "@/infrastructure/supabase/repos";

const RUTA = "/admin/horarios";
function volver(ok?: string, error?: string) {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(RUTA + q);
}

/** Agrega una clase a la plantilla semanal en uno o varios días (se repite cada semana al publicar). */
export async function crearPlantilla(formData: FormData) {
  await requireRol("administrador");
  const tipo = String(formData.get("tipo") ?? "grupal") === "personalizada" ? "personalizada" : "grupal";
  const r = await agregarClasesPlantilla(plantillaRepo(), {
    canchaId: Number(formData.get("cancha_id")),
    dias: formData.getAll("dias").map(Number),
    horaInicio: String(formData.get("hora_inicio") ?? ""),
    duracionMin: Number(formData.get("duracion") || 60),
    nivelId: Number(formData.get("nivel_id")),
    tipo,
    entrenadorId: String(formData.get("entrenador_id") ?? ""),
    cupo: Number(formData.get("cupo") || (tipo === "grupal" ? 4 : 1)),
  });
  revalidatePath(RUTA);
  volver(r.ok ? r.mensaje : undefined, r.ok ? undefined : r.mensaje);
}

export async function cambiarEstadoPlantilla(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "true";
  const { error } = await supabase.from("plantilla_bloques").update({ activo }).eq("id", id);
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA);
  volver(activo ? "Bloque reactivado en la plantilla." : "Bloque pausado: no se publicará en las próximas semanas (las ya publicadas no cambian).");
}

export async function eliminarPlantilla(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const { error } = await supabase.from("plantilla_bloques").delete().eq("id", id);
  if (error) volver(undefined, error.code === "23503" ? "Este bloque ya tiene semanas publicadas; páusalo en vez de eliminarlo." : error.message);
  revalidatePath(RUTA);
  volver("Bloque eliminado de la plantilla.");
}

/** Publica la plantilla en una semana concreta (p_lunes). */
export async function publicarSemana(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const lunes = String(formData.get("lunes") ?? "");
  if (!lunes) volver(undefined, "Escoge el lunes de la semana a publicar.");
  const { data, error } = await supabase.rpc("publicar_semana", { p_lunes: lunes });
  if (error) volver(undefined, error.message);
  const r = (data ?? {}) as { creados?: number; omitidos?: number; errores?: { fecha: string; cancha: string; hora: string; motivo: string }[] };
  const errs = r.errores ?? [];
  let msg = `Semana del ${lunes} publicada: ${r.creados ?? 0} clases creadas, ${r.omitidos ?? 0} ya existían.`;
  if (errs.length) msg += ` ${errs.length} no se pudieron crear: ` + errs.slice(0, 3).map((e) => `${e.fecha} ${e.hora.slice(0, 5)} ${e.cancha} (${e.motivo})`).join("; ") + (errs.length > 3 ? "…" : "");
  revalidatePath(RUTA); revalidatePath("/alumno"); revalidatePath("/alumno/clases");
  volver(msg, errs.length && !r.creados ? msg : undefined);
}

/** Cancela una clase ya publicada (los inscritos pasan a cancelado_academia). */
export async function cancelarBloque(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const motivo = String(formData.get("motivo") ?? "").trim() || "Cancelada por la academia";
  const { error } = await supabase.from("bloques").update({ estado: "cancelado", motivo_cancelacion: motivo }).eq("id", id);
  if (error) volver(undefined, error.message);
  // Devuelve la sesión a quienes la tenían descontada (paquete personalizado)
  const { data: afectadas } = await supabase.from("inscripciones").select("id, pago_id, sesion_descontada").eq("bloque_id", id).eq("estado", "inscrito");
  for (const i of afectadas ?? []) {
    if (i.sesion_descontada && i.pago_id) {
      const { data: p } = await supabase.from("pagos").select("sesiones_usadas").eq("id", i.pago_id).maybeSingle();
      if (p) await supabase.from("pagos").update({ sesiones_usadas: Math.max(0, (p.sesiones_usadas ?? 1) - 1) }).eq("id", i.pago_id);
    }
  }
  await supabase.from("inscripciones").update({ estado: "cancelado_academia", cancelado_en: new Date().toISOString(), motivo, sesion_descontada: false }).eq("bloque_id", id).eq("estado", "inscrito");
  revalidatePath(RUTA); revalidatePath("/alumno"); revalidatePath("/alumno/clases");
  volver("Clase cancelada. Los alumnos inscritos la verán como cancelada por la academia.");
}
