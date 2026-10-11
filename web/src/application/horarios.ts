import { filasPlantilla, resumenCreacion, validarClasePlantilla, MOTIVO_CRUCE, type NuevaClasePlantilla } from "@/domain/horarios";
import type { PlantillaRepo } from "./puertos";

/** Caso de uso: agregar una clase a la plantilla en uno o varios días. */
export async function agregarClasesPlantilla(repo: PlantillaRepo, clase: NuevaClasePlantilla) {
  const error = validarClasePlantilla(clase);
  if (error) return { ok: false as const, mensaje: error };

  const creados: number[] = [];
  const fallos: { dia: number; motivo: string }[] = [];
  for (const fila of filasPlantilla(clase)) {
    const r = await repo.insertar(fila);
    if (r.error) fallos.push({ dia: fila.dia_semana, motivo: r.error.code === "23P01" ? MOTIVO_CRUCE : r.error.message });
    else creados.push(fila.dia_semana);
  }
  return resumenCreacion(clase.horaInicio, creados, fallos);
}
