"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "À la une" },
  { href: "/recherche", label: "Recherche" },
  { href: "/veille", label: "Ma veille" },
  { href: "/favoris", label: "Marques-pages" },
  { href: "/sources", label: "Sources" },
  { href: "/a-propos", label: "À propos" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="flex flex-wrap gap-1 text-sm">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={active ? "rounded-full bg-pine-soft px-3 py-1.5 font-semibold text-pine no-underline" : "rounded-full px-3 py-1.5 no-underline hover:bg-chip"}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
