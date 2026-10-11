"use client";

import { useEffect, useState } from "react";

import { TEMA_COOKIE as COOKIE, type Tema } from "@/domain/tema";
export type { Tema };

function aplicar(t: Tema) {
  document.documentElement.dataset.theme = t;
  document.cookie = `${COOKIE}=${t}; path=/; max-age=31536000; samesite=lax`;
  try { localStorage.setItem(COOKIE, t); } catch {}
}

/** Botón que alterna entre la plantilla oscura (azul marino / lima) y la clara (blanco / verde / cian). */
export function ThemeToggle({ inicial, compacto = false }: { inicial: Tema; compacto?: boolean }) {
  const [tema, setTema] = useState<Tema>(inicial);
  useEffect(() => { aplicar(tema); }, [tema]);
  const esClaro = tema === "claro";
  return (
    <button
      type="button"
      onClick={() => setTema(esClaro ? "oscuro" : "claro")}
      title={esClaro ? "Cambiar a plantilla oscura" : "Cambiar a plantilla clara"}
      aria-label="Cambiar plantilla de colores"
      className={`inline-flex items-center gap-2 rounded-full border border-current/30 px-3 py-1 text-xs font-semibold opacity-80 hover:opacity-100 transition-opacity ${compacto ? "" : "min-w-[150px] justify-center"}`}
    >
      <span className="relative inline-block h-4 w-8 rounded-full bg-current/20">
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-lime transition-all ${esClaro ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {!compacto && <span>{esClaro ? "Plantilla clara" : "Plantilla oscura"}</span>}
    </button>
  );
}
