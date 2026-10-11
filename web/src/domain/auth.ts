/** Roles y reglas de navegación por rol (puras, sin dependencias). */
export type Rol = "administrador" | "entrenador" | "profesional" | "acudiente" | "alumno";

export type Sesion = {
  userId: string;
  email: string | null;
  nombres: string;
  apellidos: string;
  roles: Rol[];
};

export function inicioPorRol(roles: Rol[]): string {
  if (roles.includes("administrador")) return "/admin";
  if (roles.includes("entrenador")) return "/entrenador";
  if (roles.includes("acudiente") || roles.includes("alumno")) return "/alumno";
  return "/sin-rol";
}
