import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-ink no-underline">
          Fil EPS
        </Link>
        <NavLinks />
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <form action="/recherche" method="get" role="search" className="min-w-0 flex-1 sm:w-64">
            <label htmlFor="recherche-header" className="sr-only">
              Rechercher une publication
            </label>
            <input id="recherche-header" name="q" type="search" placeholder="Rechercher un article…" className="!rounded-full !py-2" />
          </form>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 text-sm text-muted md:grid-cols-3">
        <p>Fil EPS repère les publications et vous envoie vers le site d’origine. Le texte intégral n’est pas recopié.</p>
        <p>Aucun compte. Les marques-pages et la veille personnelle restent dans ce navigateur.</p>
        <p>
          <Link className="font-semibold text-pine no-underline hover:underline" href="/rss.xml">
            Flux RSS
          </Link>
          <span className="mx-2">·</span>
          <Link className="font-semibold text-pine no-underline hover:underline" href="/a-propos">
            Méthode
          </Link>
        </p>
      </div>
    </footer>
  );
}
