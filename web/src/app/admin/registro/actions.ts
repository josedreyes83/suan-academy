"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/server";
import { activarAlumno } from "@/application/alumnos";
import { alumnosRepo } from "@/infrastructure/supabase/repos";
import { requireRol } from "@/infrastructure/sesion";

const RUTA = "/admin/registro";
function volver(ok?: string, error?: string) {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(RUTA + q);
}

export async function cambiarRegistroHabilitado(formData: FormData) {
  const sesion = await requireRol("administrador");
  const supabase = await createClient();
  const valor = formData.get("habilitado") === "true" ? "true" : "false";
  const { error } = await supabase.from("parametros").update({ valor, actualizado_en: new Date().toISOString(), actualizado_por: sesion.userId }).eq("clave", "registro_habilitado");
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA); revalidatePath("/registro");
  volver(valor === "true" ? "Registro de alumnos nuevos habilitado." : "Registro de alumnos nuevos deshabilitado: el formulario mostrará 'Registro cerrado'.");
}

export async function crearLink(formData: FormData) {
  const sesion = await requireRol("administrador");
  const supabase = await createClient();
  const nombre_origen = String(formData.get("nombre_origen") ?? "").trim();
  const codigoRaw = String(formData.get("codigo") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const nivelRaw = String(formData.get("nivel_id") ?? "");
  const nivel_id = nivelRaw ? Number(nivelRaw) : null;
  const vence_en = String(formData.get("vence_en") ?? "") || null;
  const limiteRaw = String(formData.get("limite") ?? "");
  const limite = limiteRaw ? Number(limiteRaw) : null;
  if (!nombre_origen) volver(undefined, "Escribe el nombre de origen (ej. Instagram octubre).");

  const fila: Record<string, unknown> = { nombre_origen, nivel_id, vence_en, limite, creado_por: sesion.userId };
  if (codigoRaw) fila.codigo = codigoRaw;
  const { error } = await supabase.from("links_registro").insert(fila);
  if (error) volver(undefined, error.code === "23505" ? "Ya existe un link con ese código." : error.message);
  revalidatePath(RUTA);
  volver("Link creado. Cópialo y compártelo.");
}

export async function cambiarEstadoLink(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  const { error } = await supabase.from("links_registro").update({ activo }).eq("id", id);
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA);
  volver(activo ? "Link reactivado." : "Link pausado.");
}

export async function aprobarAlumno(formData: FormData) {
  const sesion = await requireRol("administrador");
  const r = await activarAlumno(alumnosRepo(), {
    alumnoId: String(formData.get("id") ?? ""),
    nivelId: Number(formData.get("nivel_id")),
    tipoAlumnoId: Number(formData.get("tipo_alumno_id")),
  }, sesion.userId);
  if (!r.ok) { volver(undefined, r.error); return; }
  const a = r.valor;
  revalidatePath(RUTA); revalidatePath("/admin");
  volver(`${a.nombre} activado. Acceso: usuario ${a.correo} · clave ${a.clave} (su número de documento). Compártelo por WhatsApp al ${a.celular}; al entrar verá las clases de su nivel.`);
}

export async function rechazarAlumno(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) volver(undefined, "Escribe el motivo del rechazo.");
  const { error } = await supabase.from("alumnos").update({ estado_registro: "rechazado", motivo_rechazo: motivo }).eq("id", id).eq("estado_registro", "pendiente");
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA); revalidatePath("/admin");
  volver("Registro rechazado; queda en el historial.");
}
