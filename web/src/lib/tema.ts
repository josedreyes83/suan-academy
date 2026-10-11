import { cookies } from "next/headers";
import type { Tema } from "@/components/ThemeToggle";

/** Plantilla de color guardada en la cookie (por defecto, oscura). */
export async function temaActual(): Promise<Tema> {
  const c = (await cookies()).get("suan_tema")?.value;
  return c === "claro" ? "claro" : "oscuro";
}
