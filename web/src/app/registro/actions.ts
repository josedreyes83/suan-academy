"use server";

import { registrarAlumno } from "@/application/registro";
import { registroRepo } from "@/infrastructure/supabase/repos";
import { edadDesde, PARQ, type SolicitudRegistro } from "@/domain/registro";

export type ResultadoRegistro = { ok: true; id: string } | { ok: false; error: string };

/** Server action: traduce el formulario a una solicitud y delega en el caso de uso. */
export async function enviarRegistro(formData: FormData): Promise<ResultadoRegistro> {
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const parq: Record<string, boolean> = {};
  for (const q of PARQ) { const v = g(q.id); if (v === "si" || v === "no") parq[q.id] = v === "si"; }
  const fecha = g("fecha_nacimiento");
  const edad = fecha ? edadDesde(fecha) : null;
  const solicitud: SolicitudRegistro = {
    codigoLink: g("codigo") || "general",
    nombres: g("nombres"), apellidos: g("apellidos"), fechaNacimiento: fecha,
    tipoDocumento: g("tipo_documento"), numeroDocumento: g("numero_documento"),
    celular: g("celular"), correo: g("correo").toLowerCase(),
    parq, parqObservaciones: g("parq_observaciones"),
    acudiente: edad !== null && edad < 18 ? {
      nombres: g("ac_nombres"), apellidos: g("ac_apellidos"), tipo_documento: g("ac_tipo_documento"),
      numero_documento: g("ac_numero_documento"), celular: g("ac_celular"), correo: g("ac_correo"), parentesco: g("ac_parentesco"),
    } : null,
    aceptaDatos: g("acepta_datos") === "on",
  };
  const r = await registrarAlumno(registroRepo(), solicitud);
  return r.ok ? { ok: true, id: r.valor } : { ok: false, error: r.error };
}
