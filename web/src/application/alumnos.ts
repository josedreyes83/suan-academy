import { type Resultado, exito, falla } from "@/domain/resultado";
import { claveDesdeDocumento, correoValido, validarActivacion, type Activacion } from "@/domain/registro";
import type { AlumnosRepo } from "./puertos";

export type Acceso = { nombre: string; correo: string; clave: string; celular: string };

/** Caso de uso: el administrador activa un registro pendiente y se crea la cuenta del alumno. */
export async function activarAlumno(repo: AlumnosRepo, a: Activacion, aprobadoPor: string): Promise<Resultado<Acceso>> {
  const error = validarActivacion(a);
  if (error) return falla(error);

  const al = await repo.porId(a.alumnoId);
  if (!al) return falla("Registro no encontrado.");
  if (al.estado_registro !== "pendiente") return falla("Este registro ya fue procesado.");

  const correo = (al.correo ?? "").trim().toLowerCase();
  if (!correoValido(correo)) return falla(`${al.nombres} ${al.apellidos} no tiene un correo válido; corrígelo antes de activar (el correo es el usuario de acceso).`);
  const clave = claveDesdeDocumento(al.numero_documento);

  const cuenta = await repo.crearCuenta({ correo, clave, nombres: al.nombres, apellidos: al.apellidos, celular: al.celular });
  if (cuenta.error || !cuenta.perfilId) return falla(cuenta.error ?? "No se pudo crear la cuenta.");

  const r = await repo.aprobar({ alumnoId: al.id, perfilId: cuenta.perfilId, nivelId: a.nivelId, tipoAlumnoId: a.tipoAlumnoId, aprobadoPor, correo, nombres: al.nombres, apellidos: al.apellidos, celular: al.celular });
  if (r.error) return falla(r.error.message);

  return exito({ nombre: `${al.nombres} ${al.apellidos}`, correo, clave, celular: al.celular });
}
