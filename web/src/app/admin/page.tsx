import Link from "next/link";
import { createClient } from "@/infrastructure/supabase/server";
import { PageHeader } from "@/components/ui";

export default async function AdminInicio() {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const [canchas, niveles, entrenadores, precios, alumnosPend, alumnosOk, plantilla, publicadas] = await Promise.all([
    supabase.from("canchas").select("id", { count: "exact", head: true }).eq("activa", true),
    supabase.from("niveles").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("entrenadores").select("perfil_id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("precios").select("id", { count: "exact", head: true }),
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado_registro", "pendiente"),
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado_registro", "aprobado"),
    supabase.from("plantilla_bloques").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("bloques").select("id", { count: "exact", head: true }).eq("estado", "publicado").gte("fecha", hoy),
  ]);

  const pasos = [
    { n: 1, label: "Canchas", href: "/admin/canchas", listo: (canchas.count ?? 0) > 0, detalle: `${canchas.count ?? 0} activas` },
    { n: 2, label: "Franjas horarias", href: "/admin/franjas", listo: true, detalle: "bloquea horas no disponibles (opcional)" },
    { n: 3, label: "Niveles", href: "/admin/niveles", listo: (niveles.count ?? 0) > 0, detalle: `${niveles.count ?? 0} activos` },
    { n: 4, label: "Entrenadores", href: "/admin/entrenadores", listo: (entrenadores.count ?? 0) > 0, detalle: `${entrenadores.count ?? 0} activos` },
    { n: 5, label: "Tipos de alumno y precios", href: "/admin/precios", listo: (precios.count ?? 0) >= 6, detalle: `${precios.count ?? 0} precios registrados` },
    { n: 6, label: "Parámetros", href: "/admin/parametros", listo: true, detalle: "valores iniciales cargados" },
    { n: 7, label: "Horarios: plantilla semanal", href: "/admin/horarios", listo: (plantilla.count ?? 0) > 0, detalle: `${plantilla.count ?? 0} clases en la plantilla` },
    { n: 8, label: "Horarios: publicar semana", href: "/admin/horarios", listo: (publicadas.count ?? 0) > 0, detalle: `${publicadas.count ?? 0} clases publicadas desde hoy` },
  ];

  return (
    <>
      <PageHeader
        title="Puesta en marcha"
        subtitle="Configura la academia en este orden. Con los ocho pasos listos, comparte el link de registro: cada alumno activado entra con su correo y su documento y escoge las clases de su nivel."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pasos.map((p) => (
          <Link key={p.n} href={p.href} className="card hover:border-lime-dk transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-muted">PASO {p.n}</span>
              <span className={p.listo ? "pill-ok" : "pill-off"}>{p.listo ? "Listo" : "Pendiente"}</span>
            </div>
            <div className="text-lg font-extrabold text-ink mt-2">{p.label}</div>
            <div className="text-sm text-muted">{p.detalle}</div>
          </Link>
        ))}
        <Link href="/admin/registro" className="card bg-ink text-white border-ink hover:border-lime transition-colors">
          <span className="text-xs font-bold tracking-widest text-teal">REGISTRO DE ALUMNOS</span>
          <div className="text-lg font-extrabold mt-2">{alumnosOk.count ?? 0} aprobados</div>
          <div className="text-sm text-neutral-300">{alumnosPend.count ?? 0} pendientes de aprobación</div>
        </Link>
      </div>
    </>
  );
}
