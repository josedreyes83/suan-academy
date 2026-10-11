/** Puertos: lo que los casos de uso necesitan del mundo exterior. La infraestructura los implementa. */
import type { SolicitudRegistro } from "@/domain/registro";

export type ErrorRepo = { code?: string; message: string };

export interface RegistroRepo {
  /** Estado del link de registro para un código exacto (nunca lista otros links). */
  estadoLink(codigo: string): Promise<{ registroHabilitado: boolean; valido: boolean }>;
  registrar(solicitud: SolicitudRegistro, versionPolitica: string): Promise<{ id?: string; error?: ErrorRepo }>;
}

export type AlumnoPendiente = {
  id: string; nombres: string; apellidos: string; correo: string | null; celular: string;
  numero_documento: string; estado_registro: string; perfil_id: string | null;
};

export interface AlumnosRepo {
  porId(id: string): Promise<AlumnoPendiente | null>;
  /** Crea la cuenta de acceso (o reutiliza una existente con ese correo) y devuelve su id. */
  crearCuenta(d: { correo: string; clave: string; nombres: string; apellidos: string; celular: string }): Promise<{ perfilId?: string; error?: string }>;
  aprobar(d: { alumnoId: string; perfilId: string; nivelId: number; tipoAlumnoId: number; aprobadoPor: string; correo: string; nombres: string; apellidos: string; celular: string }): Promise<{ error?: ErrorRepo }>;
}

export type FilaPlantilla = {
  cancha_id: number; dia_semana: number; hora_inicio: string; hora_fin: string;
  nivel_id: number; tipo: string; entrenador_id: string; cupo: number; activo: boolean;
};

export interface PlantillaRepo {
  insertar(fila: FilaPlantilla): Promise<{ error?: ErrorRepo }>;
}

export interface InscripcionesRepo {
  inscribir(bloqueId: string): Promise<{ error?: ErrorRepo }>;
  cancelar(inscripcionId: string): Promise<{ error?: ErrorRepo }>;
}
