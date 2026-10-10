import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Rol = "administrador" | "entrenador" | "profesional" | "acudiente" | "alumno";

export type Sesion = {
  userId: string;
  email: string | null;
  nombres: string;
  apellidos: string;
  roles: Rol[];
};

/** Devuelve la sesión actual con sus roles, o null si no hay usuario. */
export async function getSesion(): Promise<Sesion | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: perfil }, { data: roles }] = await Promise.all([
    supabase.from("perfiles").select("nombres, apellidos").eq("id", user.id).maybeSingle(),
    supabase.from("usuario_roles").select("rol").eq("perfil_id", user.id),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    nombres: perfil?.nombres ?? "",
    apellidos: perfil?.apellidos ?? "",
    roles: (roles ?? []).map((r) => r.rol as Rol),
  };
}

/** Exige un rol; si no hay sesión va a /login, si no tiene el rol va a su inicio. */
export async function requireRol(rol: Rol): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (!sesion.roles.includes(rol)) redirect(inicioPorRol(sesion.roles));
  return sesion;
}

export function inicioPorRol(roles: Rol[]): string {
  if (roles.includes("administrador")) return "/admin";
  if (roles.includes("entrenador")) return "/entrenador";
  if (roles.includes("acudiente") || roles.includes("alumno")) return "/alumno";
  return "/sin-rol";
}
