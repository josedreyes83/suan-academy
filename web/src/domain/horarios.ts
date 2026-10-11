/** Reglas puras de la plantilla semanal y los horarios. dia_semana: 0 = domingo … 6 = sábado. */
export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];
export const ENTRE_SEMANA = [1, 2, 3, 4, 5];

export const DURACION_MIN = 30;
export const DURACION_MAX = 240;

export function sumarMinutos(hora: string, min: number) {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + min;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export type NuevaClasePlantilla = {
  canchaIds: number[]; dias: number[]; horaInicio: string; duracionMin: number;
  nivelId: number; tipo: "grupal" | "personalizada"; entrenadorId: string; cupo: number;
};

export function validarClasePlantilla(c: NuevaClasePlantilla): string | null {
  if (!c.nivelId || !c.entrenadorId || !c.horaInicio) return "Completa hora, nivel y entrenador.";
  if (c.canchaIds.length === 0) return "Marca al menos una cancha.";
  if (c.canchaIds.some((id) => !Number.isInteger(id) || id <= 0)) return "Hay una cancha no válida.";
  if (!/^\d{2}:\d{2}$/.test(c.horaInicio)) return "La hora de inicio no es válida.";
  if (c.dias.length === 0) return "Marca al menos un día de la semana.";
  if (c.dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return "Hay un día no válido.";
  if (c.duracionMin < DURACION_MIN || c.duracionMin > DURACION_MAX) return `La duración debe estar entre ${DURACION_MIN} y ${DURACION_MAX} minutos.`;
  if (c.cupo < 1 || c.cupo > 20) return "El cupo debe estar entre 1 y 20.";
  return null;
}

/** Una fila de plantilla por cada cancha y día marcados (días en orden Lun → Dom). */
export function filasPlantilla(c: NuevaClasePlantilla) {
  const horaFin = sumarMinutos(c.horaInicio, c.duracionMin);
  const canchas = [...new Set(c.canchaIds)];
  return ORDEN_DIAS.filter((d) => c.dias.includes(d)).flatMap((dia_semana) =>
    canchas.map((cancha_id) => ({
      cancha_id, dia_semana, hora_inicio: c.horaInicio, hora_fin: horaFin,
      nivel_id: c.nivelId, tipo: c.tipo, entrenador_id: c.entrenadorId, cupo: c.cupo, activo: true,
    }))
  );
}

/** Mensaje de resultado al crear varias filas (algunas pueden fallar por cruces). */
export function resumenCreacion(horaInicio: string, creados: { dia: number; cancha: string }[], fallos: { dia: number; cancha: string; motivo: string }[]) {
  const dias = [...new Set(creados.map((c) => c.dia))].sort((a, b) => ORDEN_DIAS.indexOf(a) - ORDEN_DIAS.indexOf(b)).map((d) => DIAS_CORTO[d]).join(", ");
  const canchas = [...new Set(creados.map((c) => c.cancha))].join(", ");
  const base = creados.length
    ? `${creados.length} ${creados.length === 1 ? "clase agregada" : "clases agregadas"} a la plantilla (${dias} · ${canchas}) a las ${horaInicio}.`
    : "No se agregó ninguna clase.";
  const detalle = fallos.map((f) => `${DIAS_CORTO[f.dia]} ${f.cancha}: ${f.motivo}`).join(" · ");
  if (fallos.length && !creados.length) return { ok: false as const, mensaje: `${base} ${detalle}` };
  if (fallos.length) return { ok: true as const, mensaje: `${base} No se pudieron crear → ${detalle}` };
  return { ok: true as const, mensaje: `${base} Recuerda publicar la semana para que los alumnos las vean.` };
}

export const MOTIVO_CRUCE = "se cruza con otra clase de la misma cancha o del mismo entrenador";
