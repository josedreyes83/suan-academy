# SUAN Academy · App · Versión 1

Monorepo de la primera implementación: base de datos en Supabase y aplicación web en Next.js.

```
suan-academy/
├── supabase/migrations/0001_esquema_v1.sql   # Esquema completo (ya aplicado en el proyecto "suan-academy")
└── web/                                       # App Next.js 15 (App Router, TypeScript, Tailwind 4)
```

## Entrega 1 (esta): base de datos + módulo de configuración

| Pieza | Estado |
| --- | --- |
| Esquema: 22 tablas, 8 enumerados, RLS por rol, trigger de vigencia, vistas `v_vigencias` y `v_bloques_cupo` | Aplicado en Supabase |
| Datos iniciales: 2 tipos de alumno, 5 niveles, 3 productos, 17 parámetros | Cargados |
| Login por correo y contraseña, redirección por rol, middleware de sesión | Listo |
| Administrador: Inicio (puesta en marcha), Canchas y horarios, Franjas horarias bloqueadas, Niveles, Tipos de alumno, Precios, Entrenadores, Parámetros | Listo |
| Registro público de alumnos (`/registro` y `/registro/<código>`): datos, acudiente si es menor, PAR-Q (7 preguntas), autorización de datos (Ley 1581 de 2012) | Listo |
| Administrador → Registro de alumnos: habilitar/deshabilitar, links por campaña o nivel, bandeja de pendientes con aprobación (crea la cuenta) o rechazo | Listo |
| Entrenador / Alumno: páginas de espera | Próxima entrega |

Próximas entregas: plantilla semanal y "Publicar semana", calendario por rol, pagos, selección de clase y "Mi clase", asistencia y registro de sesión.

## Arranque local

1. Node 20+ y npm.
2. `cd web && npm install`
3. Copia `web/.env.example` a `web/.env.local` y completa:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://lnjyjnatxyxdkqtaflms.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clave *publishable* (Supabase → Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` = clave *service_role* (misma pantalla). Solo vive en el servidor; se usa para crear cuentas de entrenador.
4. `npm run dev` y abre `http://localhost:3000`.

## Usuario administrador inicial

- Correo: `admin@suanacademy.co`
- Contraseña: `Suan2026*`

Cámbiala después del primer ingreso (Supabase → Authentication → Users, o desde la app cuando exista la pantalla de perfil).

## Despliegue en Vercel

1. Sube la carpeta `web` a un repositorio (GitHub).
2. En Vercel: New Project → importa el repo → Root Directory `web`.
3. Variables de entorno: las tres del paso 3 de arriba.
4. En Supabase → Authentication → URL Configuration, agrega la URL de Vercel en *Site URL* y *Redirect URLs*.

## Cómo está organizado `web/src`

- `lib/supabase/client.ts` cliente del navegador · `server.ts` cliente de servidor (respeta RLS) y cliente admin (service_role).
- `lib/auth.ts` `getSesion()`, `requireRol()`, `inicioPorRol()`.
- `middleware.ts` refresca la sesión y protege `/admin`, `/entrenador`, `/alumno`.
- `app/admin/*` una carpeta por pantalla: `page.tsx` (Server Component que lee de Supabase) + `actions.ts` (Server Actions que escriben y vuelven con `?ok=` o `?error=`).
- `components/ui.tsx` encabezado de página, avisos, formato COP, días de la semana.
- `app/globals.css` identidad SUAN (azul marino `#0a1f33`, verde lima `#c6ff1a` → verde `#6fd63a`, turquesa `#19b8a8`) y clases `btn-*`, `input`, `card`, `table`, `pill-*`.

## Reglas que ya viven en la base de datos

- Un bloque no puede solaparse con otro en la misma cancha ni con otro del mismo entrenador (restricción de exclusión).
- Un bloque no puede crearse fuera del horario de apertura de la cancha ni sobre una franja bloqueada (`motivo_no_disponible`, migración 0002). `horas_disponibles(cancha, fecha, duración)` devuelve solo los inicios válidos para el selector de horas.
- Al registrar un pago, la app calcula `vigencia_fin` y `sesiones_totales` según el producto y los parámetros (`vigencia_mensualidad_dias`, `paquete_vigencia_dias`, `paquete_sesiones`).
- `v_vigencias` devuelve el estado `al_dia`, `por_vencer` o `vencido` de cada pago usando `aviso_por_vencer_dias` y `aviso_por_vencer_sesiones`.
- El registro público pasa por `registro_publico(...)` (migración 0003): exige `registro_habilitado = true`, link activo y vigente, documento único, acudiente si es menor de 18 y autorización de datos; guarda el PAR-Q y marca `parq_alerta` si hay algún Sí.

## Flujo del alumno (entrega 3)

1. El alumno se registra en `/registro` (o `/registro/<codigo>`); queda **pendiente de aprobación**.
2. En **Admin → Registro de alumnos** el administrador escoge nivel y **tipo de alumno** y pulsa **Activar**:
   - usuario = correo del alumno (obligatorio en el registro)
   - clave = **número de documento** (si tiene menos de 6 dígitos se completa con ceros a la izquierda)
3. El alumno entra en `/login` y cae en `/alumno` (**Mis clases**: reservas y vigencia) y `/alumno/clases` (**Escoger clase**: clases publicadas de su nivel, próximos 14 días).
4. Para que haya clases: **Admin → Horarios** → arma la plantilla semanal → **Publicar semana** (lunes). `publicar_semana` omite bloques en franjas bloqueadas y no duplica.
5. Reglas de `inscribir`: nivel igual, cupo, clase futura, tope grupal semanal (`tope_grupales_semana`), y vigencia solo si `requiere_pago_para_inscribir=true` (por defecto `false` hasta que exista la UI de pagos). Cancelar con ≥ `cancelacion_horas` devuelve la sesión del paquete.
