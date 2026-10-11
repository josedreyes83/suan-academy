import { type Resultado, exito, falla } from "@/domain/resultado";
import { VERSION_POLITICA, validarRegistro, type SolicitudRegistro } from "@/domain/registro";
import type { RegistroRepo } from "./puertos";

/** Caso de uso: un aspirante se registra por un link. */
export async function registrarAlumno(repo: RegistroRepo, solicitud: SolicitudRegistro): Promise<Resultado<string>> {
  const error = validarRegistro(solicitud);
  if (error) return falla(error);
  const r = await repo.registrar(solicitud, VERSION_POLITICA);
  if (r.error || !r.id) return falla(limpiarMensaje(r.error?.message ?? "No se pudo guardar el registro."));
  return exito(r.id);
}

/** Caso de uso: ¿se puede mostrar el formulario para este código? */
export async function estadoLinkRegistro(repo: RegistroRepo, codigo: string) {
  const codigoLimpio = codigo.trim().toLowerCase().slice(0, 64);
  if (!/^[a-z0-9-]+$/.test(codigoLimpio)) return { registroHabilitado: false, valido: false };
  return repo.estadoLink(codigoLimpio);
}

const limpiarMensaje = (m: string) => m.replace(/^.*?: /, "");
