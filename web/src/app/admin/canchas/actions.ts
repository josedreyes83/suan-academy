"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

const RUTA = "/admin/canchas";

function volver(ok?: string, error?: string) {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(RUTA + q);
}

export async function crearCancha(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const observaciones = String(formData.get("observaciones") ?? "").trim() || null;
  if (!nombre) volver(undefined, "El nombre de la cancha es obligatorio.");

  const { data, error } = await supabase.from("canchas").insert({ nombre, observaciones }).select("id").single();
  if (error) volver(undefined, error.code === "23505" ? "Ya existe una cancha con ese nombre." : error.message);

  // Horario de apertura por defecto: lunes a sábado 6:00 a 21:00
  const horarios = [1, 2, 3, 4, 5, 6].map((d) => ({ cancha_id: data!.id, dia_semana: d, hora_inicio: "06:00", hora_fin: "21:00" }));
  await supabase.from("cancha_horarios").insert(horarios);

  revalidatePath(RUTA);
  volver(`Cancha "${nombre}" creada con horario lunes a sábado 6:00 a 21:00. Ajústalo si es necesario.`);
}

export async function cambiarEstadoCancha(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  const activa = formData.get("activa") === "true";
  const { error } = await supabase.from("canchas").update({ activa }).eq("id", id);
  if (error) volver(undefined, error.message);
  revalidatePath(RUTA);
  volver(activa ? "Cancha activada." : "Cancha desactivada: no recibirá bloques nuevos.");
}

export async function guardarHorario(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const canchaId = Number(formData.get("cancha_id"));
  const observaciones = String(formData.get("observaciones") ?? "").trim() || null;

  const filas: { cancha_id: number; dia_semana: number; hora_inicio: string; hora_fin: string }[] = [];
  for (let d = 0; d <= 6; d++) {
    const abre = formData.get(`abre_${d}`) === "on";
    const ini = String(formData.get(`ini_${d}`) ?? "");
    const fin = String(formData.get(`fin_${d}`) ?? "");
    if (!abre) continue;
    if (!ini || !fin || fin <= ini) volver(undefined, `Revisa el horario del día ${d}: la hora de cierre debe ser mayor que la de apertura.`);
    filas.push({ cancha_id: canchaId, dia_semana: d, hora_inicio: ini, hora_fin: fin });
  }

  const { error: e1 } = await supabase.from("cancha_horarios").delete().eq("cancha_id", canchaId);
  if (e1) volver(undefined, e1.message);
  if (filas.length) {
    const { error: e2 } = await supabase.from("cancha_horarios").insert(filas);
    if (e2) volver(undefined, e2.message);
  }
  await supabase.from("canchas").update({ observaciones }).eq("id", canchaId);

  revalidatePath(RUTA);
  volver("Horario de apertura guardado.");
}
