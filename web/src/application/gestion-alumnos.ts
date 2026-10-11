import { type Resultado, exito, falla } from "@/domain/resultado";
import { claveDesdeDocumento } from "@/domain/registro";
import type { GestionAlumnosRepo } from "./puertos";

/** Cambiar nivel y/o tipo de un alumno activo. */
export async function cambiarNivelTipo(repo: GestionAlumnosRepo, alumnoId: string, nivelId: number, tipoAlumnoId: number): Promise<Resultado> {
  if (!alumnoId) return falla("Alumno no encontrado.");
  if (!nivelId || !tipoAlumnoId) return falla("Escoge nivel y tipo de alumno.");
  const r = await repo.actualizar(alumnoId, { nivel_id: nivelId, tipo_alumno_id: tipoAlumnoId });
  return r.error ? falla(r.error.message) : exito(undefined);
}

/** Inactivar (se retira) o reactivar un alumno. Un inactivo conserva su historial pero no puede reservar. */
export async function cambiarEstadoAlumno(repo: GestionAlumnosRepo, alumnoId: string, activo: boolean): Promise<Resultado> {
  if (!alumnoId) return falla("Alumno no encontrado.");
  const r = await repo.actualizar(alumnoId, { estado_registro: activo ? "aprobado" : "inactivo" });
  return r.error ? falla(r.error.message) : exito(undefined);
}

/** Restablece la clave del alumno a su número de documento. */
export async function restablecerClave(repo: GestionAlumnosRepo, alumnoId: string): Promise<Resultado<{ nombre: string; correo: string; clave: string }>> {
  const a = await repo.perfilDeAlumno(alumnoId);
  if (!a || !a.perfil_id) return falla("Este alumno aún no tiene cuenta de acceso (actívalo primero).");
  const clave = claveDesdeDocumento(a.numero_documento);
  const r = await repo.fijarClave(a.perfil_id, clave);
  return r.error ? falla(r.error) : exito({ nombre: a.nombres, correo: a.correo ?? "", clave });
}
