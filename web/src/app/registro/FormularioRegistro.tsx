"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enviarRegistro } from "./actions";
import { PARQ, TIPOS_DOCUMENTO, PARENTESCOS, AUTORIZACION_DATOS } from "@/lib/registro";

type Nivel = { id: number; nombre: string; descripcion: string | null };

function edadDe(fecha: string) {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export function FormularioRegistro({ codigo, niveles, nivelFijo }: { codigo: string; niveles: Nivel[]; nivelFijo: Nivel | null }) {
  const router = useRouter();
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const edad = edadDe(fecha);
  const esMenor = edad !== null && edad < 18;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await enviarRegistro(fd);
      if (!r.ok) { setError(r.error); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      router.push("/registro/listo");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="codigo" value={codigo} />
      {error && <div role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      {/* 1. Datos del alumno */}
      <section className="card">
        <h2 className="text-lg font-extrabold text-ink mb-1">1. Datos del alumno</h2>
        <p className="text-sm text-muted mb-4">Quien va a entrenar. Si es menor de 18 años, más abajo pediremos los datos del acudiente.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="nombres">Nombres</label><input id="nombres" name="nombres" className="input" required autoComplete="given-name" /></div>
          <div><label className="label" htmlFor="apellidos">Apellidos</label><input id="apellidos" name="apellidos" className="input" required autoComplete="family-name" /></div>
          <div>
            <label className="label" htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
            <input id="fecha_nacimiento" name="fecha_nacimiento" type="date" className="input" required value={fecha} onChange={(e) => setFecha(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            {edad !== null && <p className="text-xs text-muted mt-1">{edad} años{esMenor ? " · se requiere acudiente" : ""}</p>}
          </div>
          <div>
            <label className="label" htmlFor="tipo_documento">Tipo de documento</label>
            <select id="tipo_documento" name="tipo_documento" className="input" defaultValue={esMenor ? "TI" : "CC"} required>
              {TIPOS_DOCUMENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="numero_documento">Número de documento</label><input id="numero_documento" name="numero_documento" className="input" required inputMode="numeric" /></div>
          <div><label className="label" htmlFor="celular">Celular (WhatsApp)</label><input id="celular" name="celular" className="input" required inputMode="tel" placeholder="3001234567" pattern="[0-9+ ]{10,15}" /></div>
          <div><label className="label" htmlFor="correo">Correo (opcional)</label><input id="correo" name="correo" type="email" className="input" autoComplete="email" /></div>
          <div>
            <label className="label" htmlFor="nivel_id">Nivel</label>
            {nivelFijo ? (
              <input className="input" value={nivelFijo.nombre} readOnly />
            ) : (
              <select id="nivel_id" name="nivel_id" className="input" required defaultValue="">
                <option value="" disabled>Escoge tu nivel</option>
                {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}{n.descripcion ? ` — ${n.descripcion}` : ""}</option>)}
              </select>
            )}
            <p className="text-xs text-muted mt-1">Si no estás seguro, escoge el más bajo; el entrenador lo confirma.</p>
          </div>
        </div>
      </section>

      {/* 2. Acudiente */}
      {esMenor && (
        <section className="card border-teal/40">
          <h2 className="text-lg font-extrabold text-ink mb-1">2. Datos del acudiente</h2>
          <p className="text-sm text-muted mb-4">Padre, madre o representante legal. Será el contacto para pagos y avisos, y quien autoriza el tratamiento de datos del menor.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="ac_nombres">Nombres</label><input id="ac_nombres" name="ac_nombres" className="input" required /></div>
            <div><label className="label" htmlFor="ac_apellidos">Apellidos</label><input id="ac_apellidos" name="ac_apellidos" className="input" required /></div>
            <div>
              <label className="label" htmlFor="ac_tipo_documento">Tipo de documento</label>
              <select id="ac_tipo_documento" name="ac_tipo_documento" className="input" defaultValue="CC">
                {TIPOS_DOCUMENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="ac_numero_documento">Número de documento</label><input id="ac_numero_documento" name="ac_numero_documento" className="input" inputMode="numeric" /></div>
            <div><label className="label" htmlFor="ac_celular">Celular (WhatsApp)</label><input id="ac_celular" name="ac_celular" className="input" required inputMode="tel" pattern="[0-9+ ]{10,15}" /></div>
            <div><label className="label" htmlFor="ac_correo">Correo (opcional)</label><input id="ac_correo" name="ac_correo" type="email" className="input" /></div>
            <div>
              <label className="label" htmlFor="ac_parentesco">Parentesco</label>
              <select id="ac_parentesco" name="ac_parentesco" className="input" defaultValue="Madre">
                {PARENTESCOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* 3. PAR-Q */}
      <section className="card">
        <h2 className="text-lg font-extrabold text-ink mb-1">{esMenor ? "3" : "2"}. Cuestionario de aptitud para la actividad física (PAR-Q)</h2>
        <p className="text-sm text-muted mb-4">Responde con sinceridad; sirve para cuidar tu salud durante el entrenamiento. Si marcas «Sí» en alguna, el entrenador lo tendrá en cuenta y podrá pedir una valoración médica.</p>
        <ol className="space-y-4">
          {PARQ.map((p, i) => (
            <li key={p.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-fg mb-2"><span className="text-muted mr-1">{i + 1}.</span>{p.texto}</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-sm has-[:checked]:bg-ink has-[:checked]:text-white has-[:checked]:border-ink cursor-pointer">
                  <input type="radio" name={p.id} value="si" required className="sr-only" /> Sí
                </label>
                <label className="flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-sm has-[:checked]:bg-ink has-[:checked]:text-white has-[:checked]:border-ink cursor-pointer">
                  <input type="radio" name={p.id} value="no" className="sr-only" /> No
                </label>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <label className="label" htmlFor="parq_observaciones">Si respondiste «Sí» a alguna, cuéntanos brevemente (opcional)</label>
          <textarea id="parq_observaciones" name="parq_observaciones" className="input" rows={2} maxLength={400} />
        </div>
      </section>

      {/* 4. Autorización de datos */}
      <section className="card">
        <h2 className="text-lg font-extrabold text-ink mb-1">{esMenor ? "4" : "3"}. Autorización de tratamiento de datos personales</h2>
        <div className="max-h-44 overflow-y-auto rounded-md border border-line bg-bg p-3 text-xs text-fg whitespace-pre-line leading-relaxed">{AUTORIZACION_DATOS}</div>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input type="checkbox" name="acepta_datos" required className="mt-1" />
          <span>
            {esMenor
              ? "Como representante legal del menor, he leído y autorizo el tratamiento de sus datos personales y los míos conforme a este texto."
              : "He leído y autorizo el tratamiento de mis datos personales conforme a este texto."}
          </span>
        </label>
      </section>

      <button className="btn-primary w-full text-base py-3" disabled={pendiente}>{pendiente ? "Enviando…" : "Enviar registro"}</button>
      <p className="text-xs text-muted text-center">Al enviar, SUAN Academy revisará tu registro y te avisará por WhatsApp cuando esté aprobado.</p>
    </form>
  );
}
