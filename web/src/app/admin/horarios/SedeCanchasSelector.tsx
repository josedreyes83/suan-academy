"use client";

import { useState } from "react";

export type SedeOpcion = { id: number; nombre: string };
export type CanchaOpcion = { id: number; nombre: string; sede_id: number };

/** Sede → canchas de esa sede como chips (checkboxes reales, name="canchas"). Varias canchas = la misma clase en cada una. */
export function SedeCanchasSelector({ sedes, canchas }: { sedes: SedeOpcion[]; canchas: CanchaOpcion[] }) {
  const [sedeId, setSedeId] = useState<number>(sedes[0]?.id ?? 0);
  const delaSede = canchas.filter((c) => c.sede_id === sedeId);
  const [sel, setSel] = useState<number[]>(delaSede[0] ? [delaSede[0].id] : []);

  const cambiarSede = (id: number) => {
    setSedeId(id);
    const primera = canchas.find((c) => c.sede_id === id);
    setSel(primera ? [primera.id] : []);
  };
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const todas = delaSede.length > 0 && delaSede.every((c) => sel.includes(c.id));

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start">
      <div>
        <label className="label" htmlFor="sede_id">Sede</label>
        <select id="sede_id" name="sede_id" className="input" value={sedeId} onChange={(e) => cambiarSede(Number(e.target.value))}>
          {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>
      <fieldset className="min-w-0">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <legend className="label !mb-0">Canchas</legend>
          {delaSede.length > 1 && (
            <button type="button" onClick={() => setSel(todas ? [] : delaSede.map((c) => c.id))} className={`text-xs underline-offset-2 ${todas ? "text-ink font-semibold" : "text-muted underline hover:text-ink"}`}>Todas</button>
          )}
        </div>
        {delaSede.length === 0 ? (
          <p className="text-sm text-muted">Esta sede no tiene canchas activas.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Canchas de la sede">
            {delaSede.map((c) => {
              const on = sel.includes(c.id);
              return (
                <label key={c.id} className={`shrink-0 flex items-center justify-center min-h-11 px-4 rounded-md border text-sm font-semibold cursor-pointer select-none transition-colors
                  ${on ? "bg-lime border-lime-dk text-ink" : "bg-surface border-line text-muted hover:border-teal hover:text-fg"} has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal/50`}>
                  <input type="checkbox" name="canchas" value={c.id} checked={on} onChange={() => toggle(c.id)} className="sr-only" />
                  {c.nombre}
                </label>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted mt-1">
          {sel.length === 0 ? "Marca al menos una cancha." : sel.length === 1 ? "La clase se programa en esta cancha." : `La misma clase se programa en ${sel.length} canchas.`}
        </p>
      </fieldset>
    </div>
  );
}
