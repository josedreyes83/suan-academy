"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

const RUTA = "/admin/franjas";
function volver(ok?: string, error?: string) {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(RUTA + q);
}

export async function crearFranja(formData: FormData) {
  const sesion = await requireRol("administrador");
  const supabase = await createClient();
  const canchaRaw = String(formData.get("cancha_id") ?? "");
  const cancha_id = canchaRaw ? Number(canchaRaw) : null;
  const tipo = String(formData.get("tipo") ?? "recurrente");
  const dia_semana = tipo === "recurrente" ? Number(formData.get("dia_semana")) : null;
  const fecha = tipo === "fecha" ? String(formData.get("fecha") ?? "") || null : null;
  const hora_inicio = String(formData.get("hora_inicio") ?? "");
  const hora_fin = String(formData.get("hora_fin") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!motivo) volver(undefined, "Escribe el motivo del bloqueo (ej. mantenimiento, torneo, almuerzo).");
  if (!hora_inicio || !hora_fin || hora_fin <= hora_inicio) volver(undefined, "La hora final debe ser mayor que la inicial.");
  if (tipo === "fecha" && !fecha) volver(undefined, "Escoge la fecha del bloqueo.");

  const { error } = await supabase.from("franjas_bloqueadas").insert({
    cancha_id, dia_semana, fecha, hora_inicio, hora_fin, motivo, creado_por: sesion.userId,
  });
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA);
  volver("Franja bloqueada. Ya no se podrán programar bloques en ese rango.");
}

export async function cambiarEstadoFranja(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "true";
  const { error } = await supabase.from("franjas_bloqueadas").update({ activo }).eq("id", id);
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA);
  volver(activo ? "Franja bloqueada de nuevo." : "Franja habilitada: vuelve a estar disponible para programar.");
}

export async function eliminarFranja(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const { error } = await supabase.from("franjas_bloqueadas").delete().eq("id", id);
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA);
  volver("Franja eliminada.");
}
