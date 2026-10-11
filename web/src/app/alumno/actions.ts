"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

function volver(ruta: string, ok?: string, error?: string) {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(ruta + q);
}

/** El alumno escoge (reserva) una clase publicada de su nivel. */
export async function reservarClase(formData: FormData) {
  await requireRol("alumno");
  const supabase = await createClient();
  const bloque = String(formData.get("bloque_id"));
  const { error } = await supabase.rpc("inscribir", { p_bloque: bloque });
  if (error) volver("/alumno/clases", undefined, error.message);
  revalidatePath("/alumno"); revalidatePath("/alumno/clases");
  volver("/alumno", "Clase reservada. Te esperamos en la cancha.");
}

/** El alumno cancela una reserva propia. */
export async function cancelarReserva(formData: FormData) {
  await requireRol("alumno");
  const supabase = await createClient();
  const insc = String(formData.get("inscripcion_id"));
  const { error } = await supabase.rpc("cancelar_inscripcion", { p_insc: insc });
  if (error) volver("/alumno", undefined, error.message);
  revalidatePath("/alumno"); revalidatePath("/alumno/clases");
  volver("/alumno", "Reserva cancelada.");
}
