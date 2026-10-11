# Arquitectura de la app SUAN Academy (`web/`)

Arquitectura limpia en cuatro capas. La regla de dependencia va hacia adentro: **app → application → domain**, y **infrastructure** implementa los puertos que define *application*. El dominio no importa nada de Next ni de Supabase.

```
src/
├── domain/           Reglas y tipos puros. Sin I/O. Se prueban con `npm test`.
│   ├── auth.ts       Roles, Sesion, inicioPorRol
│   ├── registro.ts   PAR-Q, textos legales, validarRegistro, validarActivacion, claveDesdeDocumento
│   ├── horarios.ts   Días, sumarMinutos, validarClasePlantilla, filasPlantilla, resumenCreacion
│   ├── tema.ts       Plantillas de color
│   └── resultado.ts  Resultado<T> = éxito | falla(mensaje)
├── application/      Casos de uso. Reciben un puerto (repositorio) y devuelven Resultado.
│   ├── puertos.ts    Interfaces: RegistroRepo, AlumnosRepo, PlantillaRepo, InscripcionesRepo
│   ├── registro.ts   registrarAlumno, estadoLinkRegistro
│   ├── alumnos.ts    activarAlumno (crea la cuenta: usuario = correo, clave = documento)
│   ├── horarios.ts   agregarClasesPlantilla (una fila por día marcado)
│   └── inscripciones.ts  reservarClase, cancelarReserva
├── infrastructure/   Adaptadores al mundo real.
│   ├── supabase/server.ts   createClient (respeta RLS) · createAdminClient (service role, solo tras requireRol)
│   ├── supabase/client.ts   cliente de navegador
│   ├── supabase/repos.ts    Implementación Supabase de los puertos
│   ├── sesion.ts            getSesion / requireRol (redirige)
│   └── tema.ts              cookie de plantilla
├── app/              Rutas de Next (presentación). Las server actions solo: leen FormData → llaman un caso de uso → redirigen con ?ok= / ?error=.
└── components/       UI compartida (Logo, ThemeToggle, ui.tsx)
```

## Reglas de trabajo

1. **Una regla de negocio nueva va en `domain/`** con su prueba en `web/tests/`. Si necesita datos, se declara un método en el puerto y se implementa en `repos.ts`.
2. **Las páginas y actions no contienen reglas**: validan forma mínima del formulario y delegan. Los CRUD simples de configuración (canchas, niveles, precios, parámetros…) siguen en sus `actions.ts` porque no tienen reglas más allá de las restricciones de la base.
3. **La base de datos es la última línea de defensa**: RLS por rol, funciones `security definer` para las operaciones públicas (`registro_publico`, `link_registro_estado`) y para las que cruzan filas de varios usuarios (`inscribir`, `publicar_semana`). La app nunca confía en la URL ni en el formulario.
4. **Resultados tipados**: un caso de uso nunca lanza para errores de usuario; devuelve `{ ok:false, error }` con un mensaje listo para mostrar.

## Seguridad de los enlaces y los datos

- **Links de registro** (`/registro/<código>`): el código es aleatorio (10 hex) salvo que el admin ponga uno propio. El servidor lo resuelve con `link_registro_estado(código)`, que responde solo *válido / no válido* para ese código exacto; el rol anónimo no puede listar `links_registro` ni ninguna otra tabla (migración 0007).
- **Datos recolectados** (alumnos, acudientes, PAR-Q): solo el administrador los lee; cada alumno ve únicamente su propia fila (`alumnos_propio`) y sus inscripciones/pagos; el entrenador ve alumnos aprobados sin datos de acudientes salvo los de sus clases.
- **Cambiar un id en la URL no sirve**: no hay rutas que reciban ids de datos; las acciones (activar, reservar, cancelar) toman el id del formulario y la base rechaza lo que no pertenece al usuario (RLS o `alumno_actual()` dentro de las funciones).
- **Cuentas**: creadas solo desde el servidor con la clave de servicio, después de `requireRol("administrador")`. La clave de servicio nunca llega al navegador.
- **Sesión**: cookies httpOnly de Supabase, refrescadas en `middleware.ts`; las rutas `/admin`, `/entrenador`, `/alumno` exigen sesión y rol.

## Comandos

```bash
npm run dev      # desarrollo
npm run build    # compila y verifica tipos
npm test         # pruebas del dominio (Node 22, sin dependencias)
```
