"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRol } from "@/infrastructure/sesion";
import { inscripcionesRepo } from "@/infrastructure/supabase/repos";
import * as casos from "@/application/inscripciones";

function volver(ruta: string, ok?: string, error?: string) {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(ruta + q);
}
const refrescar = () => { revalidatePath("/alumno"); revalidatePath("/alumno/clases"); };

/** El alumno escoge (reserva) una clase publicada de su nivel. */
export async function reservarClase(formData: FormData) {
  await requireRol("alumno");
  const r = await casos.reservarClase(inscripcionesRepo(), String(formData.get("bloque_id") ?? ""));
  if (!r.ok) volver("/alumno/clases", undefined, r.error);
  refrescar();
  volver("/alumno", "Clase reservada. Te esperamos en la cancha.");
}

/** El alumno cancela una reserva propia. */
export async function cancelarReserva(formData: FormData) {
  await requireRol("alumno");
  const r = await casos.cancelarReserva(inscripcionesRepo(), String(formData.get("inscripcion_id") ?? ""));
  if (!r.ok) volver("/alumno", undefined, r.error);
  refrescar();
  volver("/alumno", "Reserva cancelada.");
}
