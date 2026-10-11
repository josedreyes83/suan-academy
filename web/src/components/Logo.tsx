import Image from "next/image";

/** Logo completo (corredor + SUAN ACADEMY). Cambia de imagen según la plantilla de color (data-theme). */
export function LogoFull({ width = 220, className = "" }: { width?: number; className?: string }) {
  return (
    <>
      <Image src="/logo-suan.png" alt="SUAN Academy" width={width} height={Math.round(width * 383 / 1315)} priority className={`logo-oscuro ${className}`} />
      <Image src="/logo-suan-claro.png" alt="SUAN Academy" width={width} height={Math.round(width * 900 / 1600)} priority className={`logo-claro ${className}`} />
    </>
  );
}

/** Solo el corredor, para espacios pequeños. Va sobre fondo oscuro. */
export function LogoIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <Image src="/icon-suan.png" alt="" width={size} height={size} className={`rounded-md ${className}`} />;
}

/** Marca en texto, para encabezados donde la imagen no cabe. */
export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="leading-none">
      <div className="text-2xl font-extrabold tracking-wide text-lime">SUAN</div>
      <div className={`text-[10px] font-semibold tracking-[0.35em] ${dark ? "text-white" : "text-ink"}`}>ACADEMY</div>
    </div>
  );
}
