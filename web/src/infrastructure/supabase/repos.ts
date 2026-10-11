/** Repositorios Supabase: implementan los puertos de la capa de aplicación. */
import { createClient, createAdminClient } from "./server";
import type { AlumnosRepo, GestionAlumnosRepo, InscripcionesRepo, PlantillaRepo, RegistroRepo } from "@/application/puertos";
import type { SolicitudRegistro } from "@/domain/registro";

export function registroRepo(): RegistroRepo {
  return {
    async estadoLink(codigo) {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("link_registro_estado", { p_codigo: codigo });
      if (!error && data) {
        const d = data as { registro_habilitado?: boolean; valido?: boolean };
        return { registroHabilitado: !!d.registro_habilitado, valido: !!d.valido };
      }
      // Respaldo mientras no exista la función (migración 0007): consulta directa
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from("parametros").select("valor").eq("clave", "registro_habilitado").maybeSingle(),
        supabase.from("links_registro").select("id, activo, vence_en").eq("codigo", codigo).maybeSingle(),
      ]);
      const hoy = new Date().toISOString().slice(0, 10);
      return { registroHabilitado: p?.valor === "true", valido: !!l && l.activo && (!l.vence_en || l.vence_en >= hoy) };
    },
    async registrar(s: SolicitudRegistro, versionPolitica) {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("registro_publico", {
        p_codigo_link: s.codigoLink,
        p_nombres: s.nombres, p_apellidos: s.apellidos, p_fecha_nacimiento: s.fechaNacimiento,
        p_tipo_documento: s.tipoDocumento, p_numero_documento: s.numeroDocumento,
        p_celular: s.celular, p_correo: s.correo, p_nivel_id: null,
        p_parq: s.parq, p_parq_observaciones: s.parqObservaciones,
        p_acudiente: s.acudiente, p_acepta_datos: s.aceptaDatos, p_version_politica: versionPolitica,
      });
      return error ? { error: { code: error.code, message: error.message } } : { id: String(data) };
    },
  };
}

export function alumnosRepo(): AlumnosRepo {
  return {
    async porId(id) {
      const supabase = await createClient();
      const { data } = await supabase.from("alumnos").select("id, nombres, apellidos, correo, celular, numero_documento, estado_registro, perfil_id").eq("id", id).maybeSingle();
      return data ?? null;
    },
    async crearCuenta({ correo, clave, nombres, apellidos, celular }) {
      const admin = createAdminClient();
      if (!admin) return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor; sin ella no se pueden crear las cuentas de los alumnos." };
      const { data: creado, error } = await admin.auth.admin.createUser({ email: correo, password: clave, email_confirm: true, user_metadata: { nombres, apellidos, celular } });
      if (creado?.user) return { perfilId: creado.user.id };
      if (error && /already|registered|exists/i.test(error.message)) {
        const { data: existente } = await admin.from("perfiles").select("id").eq("correo", correo).maybeSingle();
        if (!existente) return { error: `Ya existe una cuenta con el correo ${correo}, pero no se encontró su perfil. Revisa en Supabase → Authentication.` };
        const { error: ePass } = await admin.auth.admin.updateUserById(existente.id as string, { password: clave });
        return ePass ? { error: `No se pudo fijar la clave: ${ePass.message}` } : { perfilId: existente.id as string };
      }
      return { error: `No se pudo crear la cuenta: ${error?.message ?? "error desconocido"}` };
    },
    async aprobar(d) {
      const admin = createAdminClient();
      if (!admin) return { error: { message: "Falta SUPABASE_SERVICE_ROLE_KEY." } };
      await admin.from("perfiles").upsert({ id: d.perfilId, nombres: d.nombres, apellidos: d.apellidos, correo: d.correo, celular: d.celular });
      await admin.from("usuario_roles").upsert({ perfil_id: d.perfilId, rol: "alumno" });
      const { error } = await admin.from("alumnos").update({
        perfil_id: d.perfilId, nivel_id: d.nivelId, tipo_alumno_id: d.tipoAlumnoId, estado_registro: "aprobado",
        aprobado_en: new Date().toISOString(), aprobado_por: d.aprobadoPor,
      }).eq("id", d.alumnoId).eq("estado_registro", "pendiente");
      return error ? { error: { code: error.code, message: error.message } } : {};
    },
  };
}

export function plantillaRepo(): PlantillaRepo {
  return {
    async insertar(fila) {
      const supabase = await createClient();
      const { error } = await supabase.from("plantilla_bloques").insert(fila);
      return error ? { error: { code: error.code, message: error.message } } : {};
    },
  };
}

export function inscripcionesRepo(): InscripcionesRepo {
  return {
    async inscribir(bloqueId) {
      const supabase = await createClient();
      const { error } = await supabase.rpc("inscribir", { p_bloque: bloqueId });
      return error ? { error: { code: error.code, message: error.message } } : {};
    },
    async cancelar(inscripcionId) {
      const supabase = await createClient();
      const { error } = await supabase.rpc("cancelar_inscripcion", { p_insc: inscripcionId });
      return error ? { error: { code: error.code, message: error.message } } : {};
    },
  };
}

export function gestionAlumnosRepo(): GestionAlumnosRepo {
  return {
    async actualizar(alumnoId, cambios) {
      const supabase = await createClient(); // RLS: solo administrador
      const { error } = await supabase.from("alumnos").update(cambios).eq("id", alumnoId).in("estado_registro", ["aprobado", "inactivo"]);
      return error ? { error: { code: error.code, message: error.message } } : {};
    },
    async perfilDeAlumno(alumnoId) {
      const supabase = await createClient();
      const { data } = await supabase.from("alumnos").select("perfil_id, numero_documento, nombres, correo").eq("id", alumnoId).maybeSingle();
      return data ?? null;
    },
    async fijarClave(perfilId, clave) {
      const admin = createAdminClient();
      if (!admin) return { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." };
      const { error } = await admin.auth.admin.updateUserById(perfilId, { password: clave });
      return error ? { error: error.message } : {};
    },
  };
}
