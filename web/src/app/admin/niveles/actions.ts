"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

const RUTA = "/admin/niveles";
function volver(ok?: string, error?: string) {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(RUTA + q);
}

function leer(formData: FormData) {
  const edadMin = formData.get("edad_min") ? Number(formData.get("edad_min")) : null;
  const edadMax = formData.get("edad_max") ? Number(formData.get("edad_max")) : null;
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    orden: Number(formData.get("orden") ?? 0),
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    edad_min: edadMin,
    edad_max: edadMax,
  };
}

export async function crearNivel(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const n = leer(formData);
  if (!n.nombre) volver(undefined, "El nombre del nivel es obligatorio.");
  const { error } = await supabase.from("niveles").insert(n);
  if (error) volver(undefined, error.code === "23505" ? "Ya existe un nivel con ese nombre." : error.message);
  revalidatePath(RUTA);
  volver(`Nivel "${n.nombre}" creado.`);
}

export async function actualizarNivel(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const n = leer(formData);
  if (!n.nombre) volver(undefined, "El nombre del nivel es obligatorio.");
  const { error } = await supabase.from("niveles").update(n).eq("id", id);
  if (error) volver(undefined, error.code === "23505" ? "Ya existe un nivel con ese nombre." : error.message);
  revalidatePath(RUTA);
  volver(`Nivel "${n.nombre}" actualizado.`);
}

export async function cambiarEstadoNivel(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "true";
  const { error } = await supabase.from("niveles").update({ activo }).eq("id", id);
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA);
  volver(activo ? "Nivel activado." : "Nivel desactivado: no aparece en el link de registro ni en bloques nuevos; conserva su historial.");
}
