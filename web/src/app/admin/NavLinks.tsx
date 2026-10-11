"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex lg:flex-col gap-1 px-3 overflow-x-auto pb-2 lg:pb-0 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
        const activo = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`whitespace-nowrap snap-start rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activo ? "bg-lime text-ink" : "text-neutral-100 hover:bg-white/10 hover:text-lime"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
