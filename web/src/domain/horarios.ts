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
  canchaId: number; dias: number[]; horaInicio: string; duracionMin: number;
  nivelId: number; tipo: "grupal" | "personalizada"; entrenadorId: string; cupo: number;
};

export function validarClasePlantilla(c: NuevaClasePlantilla): string | null {
  if (!c.canchaId || !c.nivelId || !c.entrenadorId || !c.horaInicio) return "Completa cancha, hora, nivel y entrenador.";
  if (!/^\d{2}:\d{2}$/.test(c.horaInicio)) return "La hora de inicio no es válida.";
  if (c.dias.length === 0) return "Marca al menos un día de la semana.";
  if (c.dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return "Hay un día no válido.";
  if (c.duracionMin < DURACION_MIN || c.duracionMin > DURACION_MAX) return `La duración debe estar entre ${DURACION_MIN} y ${DURACION_MAX} minutos.`;
  if (c.cupo < 1 || c.cupo > 20) return "El cupo debe estar entre 1 y 20.";
  return null;
}

/** Una fila de plantilla por cada día marcado, en orden Lun → Dom. */
export function filasPlantilla(c: NuevaClasePlantilla) {
  const horaFin = sumarMinutos(c.horaInicio, c.duracionMin);
  return ORDEN_DIAS.filter((d) => c.dias.includes(d)).map((dia_semana) => ({
    cancha_id: c.canchaId, dia_semana, hora_inicio: c.horaInicio, hora_fin: horaFin,
    nivel_id: c.nivelId, tipo: c.tipo, entrenador_id: c.entrenadorId, cupo: c.cupo, activo: true,
  }));
}

/** Mensaje de resultado al crear varias filas (algunas pueden fallar por cruces). */
export function resumenCreacion(horaInicio: string, creados: number[], fallos: { dia: number; motivo: string }[]) {
  const nombres = creados.map((d) => DIAS_CORTO[d]).join(", ");
  const base = creados.length
    ? `${creados.length} ${creados.length === 1 ? "clase agregada" : "clases agregadas"} a la plantilla (${nombres}) a las ${horaInicio}.`
    : "No se agregó ninguna clase.";
  const detalle = fallos.map((f) => `${DIAS_CORTO[f.dia]}: ${f.motivo}`).join(" · ");
  if (fallos.length && !creados.length) return { ok: false as const, mensaje: `${base} ${detalle}` };
  if (fallos.length) return { ok: true as const, mensaje: `${base} No se pudieron crear → ${detalle}` };
  return { ok: true as const, mensaje: `${base} Recuerda publicar la semana para que los alumnos las vean.` };
}

export const MOTIVO_CRUCE = "se cruza con otra clase de la misma cancha o del mismo entrenador";
