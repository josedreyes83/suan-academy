"use client";

import { useState } from "react";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Selector recurrente (día de la semana) o puntual (fecha) para el formulario de franjas. */
export function TipoFranja() {
  const [tipo, setTipo] = useState<"recurrente" | "fecha">("recurrente");
  return (
    <>
      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <select id="tipo" name="tipo" className="input" value={tipo} onChange={(e) => setTipo(e.target.value as "recurrente" | "fecha")}>
          <option value="recurrente">Cada semana</option>
          <option value="fecha">Una fecha</option>
        </select>
      </div>
      {tipo === "recurrente" ? (
        <div>
          <label className="label" htmlFor="dia_semana">Día</label>
          <select id="dia_semana" name="dia_semana" className="input" defaultValue="1">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{DIAS[d]}</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="fecha">Fecha</label>
          <input id="fecha" name="fecha" type="date" className="input" required />
        </div>
      )}
    </>
  );
}
