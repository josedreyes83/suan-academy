export function LogoIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="#c6ff1a"
      strokeWidth="2.4"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 14 L40 6 L58 18 L58 46 L26 58 L6 48 Z" />
      <path d="M6 14 L26 24 L58 18" />
      <path d="M26 24 L26 58" />
      <path d="M14 20 L14 44 L26 50" />
      <path d="M40 6 L40 22" />
      <path d="M34 30 L50 24 L50 40 L34 46 Z" />
      <path d="M12 36 L22 40" />
    </svg>
  );
}

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="leading-none">
      <div className="text-2xl font-extrabold tracking-wide text-lime">SUAN</div>
      <div className={`text-[10px] font-semibold tracking-[0.35em] ${dark ? "text-white" : "text-ink"}`}>
        ACADEMY
      </div>
    </div>
  );
}
