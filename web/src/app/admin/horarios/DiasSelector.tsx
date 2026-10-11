"use client";

import { useState } from "react";

/** Lunes → Domingo (dia_semana: 0 = domingo … 6 = sábado, como en la base). */
const DIAS = [
  { v: 1, corto: "Lun", largo: "Lunes" },
  { v: 2, corto: "Mar", largo: "Martes" },
  { v: 3, corto: "Mié", largo: "Miércoles" },
  { v: 4, corto: "Jue", largo: "Jueves" },
  { v: 5, corto: "Vie", largo: "Viernes" },
  { v: 6, corto: "Sáb", largo: "Sábado" },
  { v: 0, corto: "Dom", largo: "Domingo" },
];
const ENTRE_SEMANA = [1, 2, 3, 4, 5];

/** Selector de varios días: chips que son checkboxes reales (name="dias"). */
export function DiasSelector({ inicial = [1] }: { inicial?: number[] }) {
  const [sel, setSel] = useState<number[]>(inicial);
  const toggle = (v: number) => setSel((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  const esEntreSemana = ENTRE_SEMANA.every((d) => sel.includes(d)) && sel.length === 5;
  const esTodos = sel.length === 7;

  return (
    <fieldset className="min-w-0">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <legend className="label !mb-0">Días</legend>
        <div className="flex gap-3 text-xs">
          <button type="button" onClick={() => setSel(esEntreSemana ? [] : ENTRE_SEMANA)} className={`underline-offset-2 ${esEntreSemana ? "text-ink font-semibold" : "text-muted underline hover:text-ink"}`}>Lun–Vie</button>
          <button type="button" onClick={() => setSel(esTodos ? [] : DIAS.map((d) => d.v))} className={`underline-offset-2 ${esTodos ? "text-ink font-semibold" : "text-muted underline hover:text-ink"}`}>Todos</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Días de la semana">
        {DIAS.map((d) => {
          const on = sel.includes(d.v);
          return (
            <label
              key={d.v}
              title={d.largo}
              className={`relative flex items-center justify-center min-h-11 rounded-md border text-sm font-semibold cursor-pointer select-none transition-colors
                ${on ? "bg-lime border-lime-dk text-ink" : "bg-surface border-line text-muted hover:border-teal hover:text-fg"}
                has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal/50`}
            >
              <input type="checkbox" name="dias" value={d.v} checked={on} onChange={() => toggle(d.v)} className="sr-only" />
              <span aria-hidden="true">{d.corto}</span>
              <span className="sr-only">{d.largo}</span>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-muted mt-1">
        {sel.length === 0 ? "Marca al menos un día." : `Se crea una clase por cada día marcado (${sel.length}).`}
      </p>
    </fieldset>
  );
}
