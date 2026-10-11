"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRol } from "@/infrastructure/sesion";
import { gestionAlumnosRepo } from "@/infrastructure/supabase/repos";
import * as casos from "@/application/gestion-alumnos";

const RUTA = "/admin/alumnos";
function volver(ok?: string, error?: string, filtro?: string) {
  const p = new URLSearchParams();
  if (filtro) p.set("estado", filtro);
  if (error) p.set("error", error); else if (ok) p.set("ok", ok);
  const q = p.toString();
  redirect(RUTA + (q ? `?${q}` : ""));
}
const refrescar = () => { revalidatePath(RUTA); revalidatePath("/admin"); revalidatePath("/alumno"); revalidatePath("/alumno/clases"); };

export async function cambiarNivelTipo(formData: FormData) {
  await requireRol("administrador");
  const r = await casos.cambiarNivelTipo(gestionAlumnosRepo(), String(formData.get("id") ?? ""), Number(formData.get("nivel_id")), Number(formData.get("tipo_alumno_id")));
  refrescar();
  volver(r.ok ? "Nivel y tipo actualizados." : undefined, r.ok ? undefined : r.error, String(formData.get("filtro") ?? ""));
}

export async function cambiarEstadoAlumno(formData: FormData) {
  await requireRol("administrador");
  const activo = formData.get("activo") === "true";
  const r = await casos.cambiarEstadoAlumno(gestionAlumnosRepo(), String(formData.get("id") ?? ""), activo);
  refrescar();
  volver(r.ok ? (activo ? "Alumno reactivado: ya puede reservar clases." : "Alumno inactivado: conserva su historial pero no puede reservar.") : undefined, r.ok ? undefined : r.error, String(formData.get("filtro") ?? ""));
}

export async function restablecerClave(formData: FormData) {
  await requireRol("administrador");
  const r = await casos.restablecerClave(gestionAlumnosRepo(), String(formData.get("id") ?? ""));
  if (!r.ok) { volver(undefined, r.error, String(formData.get("filtro") ?? "")); return; }
  volver(`Clave de ${r.valor.nombre} restablecida: usuario ${r.valor.correo} · clave ${r.valor.clave} (su documento).`, undefined, String(formData.get("filtro") ?? ""));
}
