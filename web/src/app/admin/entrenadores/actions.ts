"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRol } from "@/lib/auth";

const RUTA = "/admin/entrenadores";
function volver(ok?: string, error?: string) {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(RUTA + q);
}

export async function crearEntrenador(formData: FormData) {
  await requireRol("administrador");
  const admin = createAdminClient();
  if (!admin) volver(undefined, "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor; sin ella no se pueden crear cuentas de entrenador.");

  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const celular = String(formData.get("celular") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");
  const niveles = formData.getAll("niveles").map(Number).filter(Boolean);
  if (!nombres || !apellidos || !correo || clave.length < 8) volver(undefined, "Nombres, apellidos, correo y una contraseña de al menos 8 caracteres son obligatorios.");
  if (niveles.length === 0) volver(undefined, "Selecciona al menos un nivel que dicta.");

  const { data: creado, error: eUser } = await admin!.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true,
    user_metadata: { nombres, apellidos, celular },
  });
  if (eUser || !creado?.user) {
    volver(undefined, eUser?.message ?? "No se pudo crear el usuario.");
    return;
  }
  const id = creado.user.id;

  // El trigger crea el perfil; aseguramos datos y roles con el cliente admin (salta RLS)
  await admin!.from("perfiles").upsert({ id, nombres, apellidos, correo, celular });
  const { error: eRol } = await admin!.from("usuario_roles").upsert({ perfil_id: id, rol: "entrenador" });
  if (eRol) volver(undefined, eRol.message);
  const { error: eEnt } = await admin!.from("entrenadores").upsert({ perfil_id: id, activo: true });
  if (eEnt) volver(undefined, eEnt.message);
  await admin!.from("entrenador_niveles").insert(niveles.map((nivel_id) => ({ entrenador_id: id, nivel_id })));

  revalidatePath(RUTA);
  volver(`Entrenador ${nombres} ${apellidos} creado. Entra con ${correo} y la contraseña asignada.`);
}

export async function actualizarEntrenador(formData: FormData) {
  await requireRol("administrador");
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const celular = String(formData.get("celular") ?? "").trim();
  const activo = formData.get("activo") === "on";
  const niveles = formData.getAll("niveles").map(Number).filter(Boolean);

  const { error: e1 } = await supabase.from("perfiles").update({ nombres, apellidos, celular }).eq("id", id);
  if (e1) volver(undefined, e1.message);
  const { error: e2 } = await supabase.from("entrenadores").update({ activo }).eq("perfil_id", id);
  if (e2) volver(undefined, e2.message);
  await supabase.from("entrenador_niveles").delete().eq("entrenador_id", id);
  if (niveles.length) await supabase.from("entrenador_niveles").insert(niveles.map((nivel_id) => ({ entrenador_id: id, nivel_id })));

  revalidatePath(RUTA);
  volver("Entrenador actualizado.");
}
