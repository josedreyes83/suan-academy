import { type Resultado, exito, falla } from "@/domain/resultado";
import type { InscripcionesRepo } from "./puertos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Caso de uso: el alumno reserva una clase publicada (las reglas de cupo, nivel y vigencia viven en la base). */
export async function reservarClase(repo: InscripcionesRepo, bloqueId: string): Promise<Resultado> {
  if (!UUID.test(bloqueId)) return falla("Clase no válida.");
  const r = await repo.inscribir(bloqueId);
  return r.error ? falla(r.error.message) : exito(undefined);
}

export async function cancelarReserva(repo: InscripcionesRepo, inscripcionId: string): Promise<Resultado> {
  if (!UUID.test(inscripcionId)) return falla("Reserva no válida.");
  const r = await repo.cancelar(inscripcionId);
  return r.error ? falla(r.error.message) : exito(undefined);
}
