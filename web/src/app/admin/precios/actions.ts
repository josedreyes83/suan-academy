"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

const RUTA = "/admin/precios";
function volver(ok?: string, error?: string) {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(RUTA + q);
}

export async function registrarPrecio(formData: FormData) {
  const sesion = await requireRol("administrador");
  const supabase = await createClient();
  const producto_id = Number(formData.get("producto_id"));
  const tipo_alumno_id = Number(formData.get("tipo_alumno_id"));
  const nivelRaw = String(formData.get("nivel_id") ?? "");
  const nivel_id = nivelRaw ? Number(nivelRaw) : null;
  const valor = Number(String(formData.get("valor") ?? "").replace(/[^\d]/g, ""));
  const vigente_desde = String(formData.get("vigente_desde") ?? "") || new Date().toISOString().slice(0, 10);

  if (!producto_id || !tipo_alumno_id) volver(undefined, "Escoge producto y tipo de alumno.");
  if (!Number.isFinite(valor) || valor < 0) volver(undefined, "El valor debe ser un número mayor o igual a 0.");

  const { error } = await supabase
    .from("precios")
    .insert({ producto_id, tipo_alumno_id, nivel_id, valor, vigente_desde, creado_por: sesion.userId });
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA);
  volver("Precio registrado. El anterior queda en el historial.");
}
