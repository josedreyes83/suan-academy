"use client";

import { useEffect, useState } from "react";

/** Muestra el link completo (con el dominio actual) y lo copia al portapapeles. */
export function CopiarLink({ ruta }: { ruta: string }) {
  const [url, setUrl] = useState(ruta);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => { setUrl(`${window.location.origin}${ruta}`); }, [ruta]);

  async function copiar() {
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }
    catch { window.prompt("Copia el link:", url); }
  }
  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-bg border border-line rounded px-2 py-1 max-w-[260px] truncate">{url}</code>
      <button type="button" onClick={copiar} className="text-xs underline text-muted hover:text-ink whitespace-nowrap">{copiado ? "Copiado" : "Copiar"}</button>
    </div>
  );
}
