/** Textos y constantes del registro de alumnos (compartidos por formulario y administración). */

export const VERSION_POLITICA = "v1-2026-10";

export const PARQ: { id: `q${1 | 2 | 3 | 4 | 5 | 6 | 7}`; texto: string }[] = [
  { id: "q1", texto: "¿Alguna vez su médico le ha dicho que tiene un problema en el corazón y que solo debería hacer actividad física recomendada por un profesional sanitario?" },
  { id: "q2", texto: "¿Siente dolor en el pecho cuando hace actividad física?" },
  { id: "q3", texto: "¿Le ha dolido el pecho en el último mes, cuando no estaba haciendo ejercicio?" },
  { id: "q4", texto: "¿Pierde el equilibrio a causa de mareos o alguna vez ha perdido el conocimiento?" },
  { id: "q5", texto: "¿Tiene algún problema en los huesos o articulaciones (por ejemplo, espalda, rodillas o cadera) que pueda empeorar por las actividades físicas propuestas?" },
  { id: "q6", texto: "¿Su médico actualmente le ha prescrito medicación para la tensión arterial o el corazón?" },
  { id: "q7", texto: "¿Sabe de cualquier otra razón por la cual no debería hacer actividad física?" },
];

export const TIPOS_DOCUMENTO = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "RC", label: "Registro civil" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PASAPORTE", label: "Pasaporte" },
];

export const PARENTESCOS = ["Madre", "Padre", "Abuelo/a", "Tío/a", "Hermano/a", "Tutor legal", "Otro"];

/** Autorización de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013). */
export const AUTORIZACION_DATOS = `En cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas que regulan la protección de datos personales en Colombia, autorizo de manera libre, previa, expresa e informada a SUAN ACADEMY, como responsable del tratamiento, para recolectar, almacenar, usar, circular, actualizar y suprimir mis datos personales y los del menor que represento, incluidos datos de contacto, identificación y la información de salud suministrada en el cuestionario PAR-Q, con las siguientes finalidades: (1) gestionar la inscripción, programación de clases, asistencia y pagos; (2) velar por la seguridad y la salud del alumno durante la práctica deportiva y adaptar el entrenamiento a sus condiciones; (3) contactarme por celular, WhatsApp o correo con información sobre horarios, pagos y novedades de la academia; (4) generar informes de avance para el alumno y su familia.

Declaro que conozco que la información de salud es un dato sensible y que su suministro es voluntario, y que tengo derecho a conocer, actualizar, rectificar y suprimir mis datos, a solicitar prueba de esta autorización y a revocarla, presentando la solicitud a través de los canales de contacto de SUAN ACADEMY. Cuando el titular sea menor de 18 años, esta autorización la otorga su representante legal en ejercicio de la patria potestad o tutela, respetando el interés superior del menor y sus derechos fundamentales.`;

// ---------- Reglas del registro y la activación ----------

export const correoValido = (correo: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

/** Edad en años cumplidos a partir de una fecha ISO (yyyy-mm-dd). */
export function edadDesde(fechaISO: string, hoy = new Date()): number | null {
  const d = new Date(fechaISO + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  let edad = hoy.getFullYear() - d.getFullYear();
  const m = hoy.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < d.getDate())) edad--;
  return edad;
}

/** Clave inicial del alumno: su número de documento (mínimo 6 caracteres; se completa con ceros). */
export function claveDesdeDocumento(doc: string) {
  const limpio = doc.replace(/\s+/g, "");
  return limpio.length >= 6 ? limpio : limpio.padStart(6, "0");
}

export type Acudiente = { nombres: string; apellidos: string; tipo_documento: string; numero_documento: string; celular: string; correo: string; parentesco: string };

export type SolicitudRegistro = {
  codigoLink: string;
  nombres: string; apellidos: string; fechaNacimiento: string;
  tipoDocumento: string; numeroDocumento: string; celular: string; correo: string;
  parq: Record<string, boolean>; parqObservaciones: string;
  acudiente: Acudiente | null;
  aceptaDatos: boolean;
};

/** Valida la solicitud de registro; devuelve el primer error legible o null. */
export function validarRegistro(s: SolicitudRegistro): string | null {
  if (!s.nombres || !s.apellidos) return "Escribe nombres y apellidos.";
  if (!s.fechaNacimiento) return "La fecha de nacimiento es obligatoria.";
  const edad = edadDesde(s.fechaNacimiento);
  if (edad === null || edad < 3 || edad > 100) return "Revisa la fecha de nacimiento.";
  if (!s.numeroDocumento) return "El número de documento es obligatorio.";
  if (!/^[0-9+ ]{10,15}$/.test(s.celular)) return "Escribe un celular válido (10 dígitos).";
  if (!correoValido(s.correo)) return "Escribe un correo válido: será tu usuario para entrar a la app.";
  for (let i = 1; i <= PARQ.length; i++) {
    if (typeof s.parq[`q${i}`] !== "boolean") return `Responde la pregunta ${i} del cuestionario de salud.`;
  }
  if (!s.aceptaDatos) return "Debes autorizar el tratamiento de datos personales para continuar.";
  if (edad < 18 && (!s.acudiente || !s.acudiente.nombres || !s.acudiente.apellidos || !s.acudiente.celular)) {
    return "Para menores de 18 años, completa nombres, apellidos y celular del acudiente.";
  }
  return null;
}

/** Datos que el administrador fija al activar un alumno. */
export type Activacion = { alumnoId: string; nivelId: number; tipoAlumnoId: number };

export function validarActivacion(a: Activacion): string | null {
  if (!a.alumnoId) return "Registro no encontrado.";
  if (!a.nivelId) return "Escoge el nivel del alumno antes de activarlo.";
  if (!a.tipoAlumnoId) return "Escoge el tipo de alumno antes de activarlo.";
  return null;
}
