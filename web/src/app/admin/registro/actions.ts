"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

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

/** Clave inicial del alumno: su número de documento (Supabase exige mínimo 6 caracteres; si es más corto se completa con ceros a la izquierda). */
function claveDesdeDocumento(doc: string) {
  const limpio = doc.replace(/\s+/g, "");
  return limpio.length >= 6 ? limpio : limpio.padStart(6, "0");
}

export async function aprobarAlumno(formData: FormData) {
  const sesion = await requireRol("administrador");
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!admin) volver(undefined, "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor; sin ella no se pueden crear las cuentas de los alumnos.");

  const id = String(formData.get("id"));
  const nivel_id = Number(formData.get("nivel_id"));
  const tipo_alumno_id = Number(formData.get("tipo_alumno_id"));
  if (!nivel_id) volver(undefined, "Escoge el nivel del alumno antes de activarlo.");
  if (!tipo_alumno_id) volver(undefined, "Escoge el tipo de alumno antes de activarlo.");

  const { data: al } = await supabase.from("alumnos").select("id, nombres, apellidos, correo, celular, numero_documento, estado_registro, perfil_id").eq("id", id).single();
  if (!al) volver(undefined, "Registro no encontrado.");
  if (al!.estado_registro !== "pendiente") volver(undefined, "Este registro ya fue procesado.");

  // Usuario del alumno: su correo (obligatorio en el registro)
  const correo = (al!.correo ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) volver(undefined, `${al!.nombres} ${al!.apellidos} no tiene un correo válido; corrígelo antes de activar (el correo es el usuario de acceso).`);
  const clave = claveDesdeDocumento(al!.numero_documento);
  let perfilId: string | null = null;
  const { data: creado, error: eUser } = await admin!.auth.admin.createUser({
    email: correo, password: clave, email_confirm: true,
    user_metadata: { nombres: al!.nombres, apellidos: al!.apellidos, celular: al!.celular },
  });
  if (creado?.user) {
    perfilId = creado.user.id;
  } else if (eUser && /already|registered|exists/i.test(eUser.message)) {
    // Ya existe una cuenta con ese correo (p. ej. un acudiente o un registro anterior): se reutiliza y se fija la clave con el documento.
    const { data: existente } = await admin!.from("perfiles").select("id").eq("correo", correo).maybeSingle();
    if (!existente) { volver(undefined, `Ya existe una cuenta con el correo ${correo}, pero no se encontró su perfil. Revisa en Supabase → Authentication.`); return; }
    perfilId = existente.id as string;
    const { error: ePass } = await admin!.auth.admin.updateUserById(existente.id as string, { password: clave });
    if (ePass) { volver(undefined, `No se pudo fijar la clave: ${ePass.message}`); return; }
  } else {
    volver(undefined, `No se pudo crear la cuenta: ${eUser?.message ?? "error desconocido"}`); return;
  }

  await admin!.from("perfiles").upsert({ id: perfilId, nombres: al!.nombres, apellidos: al!.apellidos, correo, celular: al!.celular });
  await admin!.from("usuario_roles").upsert({ perfil_id: perfilId, rol: "alumno" });
  const { error: eAl } = await admin!.from("alumnos").update({
    perfil_id: perfilId, nivel_id, tipo_alumno_id, estado_registro: "aprobado", aprobado_en: new Date().toISOString(), aprobado_por: sesion.userId,
  }).eq("id", id);
  if (eAl) volver(undefined, eAl.message);

  revalidatePath(RUTA); revalidatePath("/admin");
  volver(`${al!.nombres} ${al!.apellidos} activado. Acceso: usuario ${correo} · clave ${clave} (su número de documento). Compártelo por WhatsApp al ${al!.celular}; al entrar verá las clases de su nivel.`);
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
