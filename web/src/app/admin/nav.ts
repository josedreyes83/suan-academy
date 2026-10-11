/** Estructura del menú del administrador: grupos por tarea, de lo diario a la configuración. */
export type IconoNav = "inicio" | "alumnos" | "clases" | "academia" | "planes" | "ajustes";

export type ItemNav = { href: string; label: string; badge?: "pendientes" };
export type GrupoNav = { id: string; label: string; icono: IconoNav; items: ItemNav[] };

export const NAV_ADMIN: GrupoNav[] = [
  { id: "inicio", label: "Inicio", icono: "inicio", items: [{ href: "/admin", label: "Inicio" }] },
  {
    id: "alumnos", label: "Alumnos", icono: "alumnos",
    items: [
      { href: "/admin/alumnos/pendientes", label: "Pendientes de aprobación", badge: "pendientes" },
      { href: "/admin/alumnos", label: "Alumnos registrados" },
      { href: "/admin/registro", label: "Links de registro" },
    ],
  },
  {
    id: "clases", label: "Clases", icono: "clases",
    items: [
      { href: "/admin/horarios", label: "Plantilla semanal" },
      { href: "/admin/horarios/publicadas", label: "Clases publicadas" },
    ],
  },
  {
    id: "academia", label: "Academia", icono: "academia",
    items: [
      { href: "/admin/canchas", label: "Sedes y canchas" },
      { href: "/admin/franjas", label: "Franjas bloqueadas" },
      { href: "/admin/entrenadores", label: "Entrenadores" },
    ],
  },
  {
    id: "planes", label: "Planes y pagos", icono: "planes",
    items: [
      { href: "/admin/niveles", label: "Niveles" },
      { href: "/admin/tipos-alumno", label: "Tipos de alumno" },
      { href: "/admin/precios", label: "Precios" },
    ],
  },
  { id: "ajustes", label: "Ajustes", icono: "ajustes", items: [{ href: "/admin/parametros", label: "Parámetros" }] },
];

/** ¿La ruta actual pertenece a este item? Las rutas más específicas ganan (p. ej. /admin/alumnos/pendientes sobre /admin/alumnos). */
export function itemActivo(pathname: string): string | null {
  const todas = NAV_ADMIN.flatMap((g) => g.items.map((i) => i.href));
  const candidatas = todas.filter((h) => (h === "/admin" ? pathname === "/admin" : pathname === h || pathname.startsWith(h + "/")));
  return candidatas.sort((a, b) => b.length - a.length)[0] ?? null;
}
