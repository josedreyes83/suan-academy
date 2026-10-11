"use server";

import { createClient } from "@/lib/supabase/server";
import { VERSION_POLITICA } from "@/lib/registro";

export type ResultadoRegistro = { ok: true; id: string } | { ok: false; error: string };

export async function enviarRegistro(formData: FormData): Promise<ResultadoRegistro> {
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const codigo = g("codigo") || "general";
  const fecha = g("fecha_nacimiento");
  if (!fecha) return { ok: false, error: "La fecha de nacimiento es obligatoria." };
  const correo = g("correo").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { ok: false, error: "Escribe un correo válido: será tu usuario para entrar a la app." };
  const edad = Math.floor((Date.now() - new Date(fecha).getTime()) / (365.25 * 24 * 3600 * 1000));

  const parq: Record<string, boolean> = {};
  for (let i = 1; i <= 7; i++) {
    const v = g(`q${i}`);
    if (v !== "si" && v !== "no") return { ok: false, error: `Responde la pregunta ${i} del cuestionario de salud.` };
    parq[`q${i}`] = v === "si";
  }
  if (g("acepta_datos") !== "on") return { ok: false, error: "Debes autorizar el tratamiento de datos personales para continuar." };

  const acudiente = edad < 18 ? {
    nombres: g("ac_nombres"), apellidos: g("ac_apellidos"), tipo_documento: g("ac_tipo_documento"),
    numero_documento: g("ac_numero_documento"), celular: g("ac_celular"), correo: g("ac_correo"), parentesco: g("ac_parentesco"),
  } : null;
  if (acudiente && (!acudiente.nombres || !acudiente.apellidos || !acudiente.celular)) {
    return { ok: false, error: "Para menores de 18 años, completa nombres, apellidos y celular del acudiente." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registro_publico", {
    p_codigo_link: codigo,
    p_nombres: g("nombres"), p_apellidos: g("apellidos"), p_fecha_nacimiento: fecha,
    p_tipo_documento: g("tipo_documento"), p_numero_documento: g("numero_documento"),
    p_celular: g("celular"), p_correo: correo, p_nivel_id: g("nivel_id") ? Number(g("nivel_id")) : null,
    p_parq: parq, p_parq_observaciones: g("parq_observaciones"),
    p_acudiente: acudiente, p_acepta_datos: true, p_version_politica: VERSION_POLITICA,
  });
  if (error) return { ok: false, error: error.message.replace(/^.*?: /, "") };
  return { ok: true, id: String(data) };
}
