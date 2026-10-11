import { redirect } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/server";
import { inicioPorRol, type Rol, type Sesion } from "@/domain/auth";

export type { Rol, Sesion };
export { inicioPorRol };

/** Sesión actual con sus roles, o null si no hay usuario (validado contra el servidor de auth). */
export async function getSesion(): Promise<Sesion | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: perfil }, { data: roles }] = await Promise.all([
    supabase.from("perfiles").select("nombres, apellidos").eq("id", user.id).maybeSingle(),
    supabase.from("usuario_roles").select("rol").eq("perfil_id", user.id),
  ]);
  return { userId: user.id, email: user.email ?? null, nombres: perfil?.nombres ?? "", apellidos: perfil?.apellidos ?? "", roles: (roles ?? []).map((r) => r.rol as Rol) };
}

/** Exige un rol; sin sesión → /login; sin el rol → su inicio. */
export async function requireRol(rol: Rol): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (!sesion.roles.includes(rol)) redirect(inicioPorRol(sesion.roles));
  return sesion;
}
