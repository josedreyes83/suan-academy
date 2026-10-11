import { cookies } from "next/headers";
import { TEMA_COOKIE, temaDesde, type Tema } from "@/domain/tema";

/** Plantilla de color guardada en la cookie (por defecto, oscura). */
export async function temaActual(): Promise<Tema> {
  return temaDesde((await cookies()).get(TEMA_COOKIE)?.value);
}
