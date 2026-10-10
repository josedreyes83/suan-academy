"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

const RUTA = "/admin/parametros";

export async function guardarParametros(formData: FormData) {
  const sesion = await requireRol("administrador");
  const supabase = await createClient();
  const { data: actuales } = await supabase.from("parametros").select("clave, valor");
  const cambios: { clave: string; valor: string }[] = [];
  for (const p of actuales ?? []) {
    const nuevo = formData.get(`p_${p.clave}`);
    if (nuevo === null) continue;
    const v = String(nuevo).trim();
    if (v !== p.valor) cambios.push({ clave: p.clave, valor: v });
  }
  for (const c of cambios) {
    const { error } = await supabase
      .from("parametros")
      .update({ valor: c.valor, actualizado_en: new Date().toISOString(), actualizado_por: sesion.userId })
      .eq("clave", c.clave);
    if (error) redirect(`${RUTA}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(RUTA);
  redirect(`${RUTA}?ok=${encodeURIComponent(cambios.length ? `${cambios.length} parámetro(s) actualizado(s). Aplican a inscripciones y pagos nuevos.` : "No había cambios.")}`);
}
