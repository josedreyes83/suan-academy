"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/server";
import { requireRol } from "@/infrastructure/sesion";

const RUTA = "/admin/tipos-alumno";
function volver(ok?: string, error?: string) {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(RUTA + q);
}

export async function actualizarTipo(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const beneficios = String(formData.get("beneficios") ?? "").trim() || null;
  const activo = formData.get("activo") === "on";
  if (!nombre) volver(undefined, "El nombre es obligatorio.");
  const { error } = await supabase.from("tipos_alumno").update({ nombre, beneficios, activo }).eq("id", id);
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA);
  volver(`Tipo "${nombre}" guardado.`);
}

export async function crearTipo(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const codigo = nombre.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const beneficios = String(formData.get("beneficios") ?? "").trim() || null;
  if (!nombre) volver(undefined, "El nombre es obligatorio.");
  const { error } = await supabase.from("tipos_alumno").insert({ codigo, nombre, beneficios });
  if (error) volver(undefined, error.code === "23505" ? "Ya existe un tipo con ese nombre." : error.message);
  revalidatePath(RUTA);
  volver(`Tipo "${nombre}" creado. Recuerda registrar sus precios.`);
}
