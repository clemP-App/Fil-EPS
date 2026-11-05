import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { FavoriteButton } from "@/components/FavoriteButton";
import { formatLongDate } from "@/lib/dates";
import { sourceKicker } from "@/lib/format";
import type { Publication } from "@/lib/types";

export function TagList({ publication }: { publication: Publication }) {
  const labels = [...new Set([
    ...publication.themes.map((term) => term.label),
    ...publication.apsas.map((term) => term.label),
    ...publication.levels.map((term) => term.label),
    ...publication.tags.map((term) => term.label),
  ])].slice(0, 4);
  if (!labels.length && !publication.contentTypeLabel) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {publication.contentTypeLabel ? <li className="rounded-full bg-pine-soft px-2.5 py-0.5 text-xs font-semibold text-pine">{publication.contentTypeLabel}</li> : null}
      {labels.map((label) => (
        <li key={label} className="rounded-full bg-chip px-2.5 py-0.5 text-xs text-muted">
          {label}
        </li>
      ))}
    </ul>
  );
}

export function Story({ publication, variant = "line" }: { publication: Publication; variant?: "lead" | "card" | "line" }) {
  const href = `/publication/${publication.id}`;
  const kicker = sourceKicker(publication.sourceName, publication.sourceKind);
  const date = publication.publishedAt ? <time dateTime={publication.publishedAt}>{formatLongDate(publication.publishedAt)}</time> : <span>Date inconnue</span>;

  if (variant === "lead") {
    return (
      <article className="surface grid overflow-hidden lg:grid-cols-12">
        <div className="relative min-h-72 lg:col-span-7">
          <CoverImage src={publication.imageUrl} academy={publication.sourceName} className="min-h-72" />
          <div className="absolute top-4 right-4">
            <FavoriteButton id={publication.id} />
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4 p-6 lg:col-span-5 lg:p-8">
          <p className="text-xs font-bold tracking-wide text-pine uppercase">{kicker}</p>
          <h2 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
            <Link href={href} className="no-underline hover:text-pine">{publication.title}</Link>
          </h2>
          <p className="text-sm text-muted">{date}</p>
          {publication.summary ? <p className="text-lg leading-relaxed text-ink/90">{publication.summary}</p> : <p className="text-muted">La source ne fournit pas de résumé.</p>}
          <TagList publication={publication} />
        </div>
      </article>
    );
  }

  if (variant === "card") {
    return (
      <article className="surface flex h-full flex-col overflow-hidden">
        <div className="relative">
          <CoverImage src={publication.imageUrl} academy={publication.sourceName} className="aspect-[16/10]" />
          <div className="absolute top-3 right-3">
            <FavoriteButton id={publication.id} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <p className="text-xs font-bold tracking-wide text-pine uppercase">{kicker}</p>
          <h3 className="text-xl leading-snug font-bold tracking-tight">
            <Link href={href} className="no-underline hover:text-pine">{publication.title}</Link>
          </h3>
          <p className="text-sm text-muted">{date}</p>
          {publication.summary ? <p className="line-clamp-3 text-sm leading-relaxed text-muted">{publication.summary}</p> : null}
          <div className="mt-auto pt-2">
            <TagList publication={publication} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="grid gap-3 border-b border-line py-5 sm:grid-cols-[7.5rem_1fr] sm:gap-5">
      <p className="text-sm text-muted">{date}</p>
      <div className="flex gap-4">
        {publication.imageUrl ? (
          <Link href={href} className="relative block h-20 w-28 shrink-0 overflow-hidden rounded-xl" tabIndex={-1} aria-hidden="true">
            <CoverImage src={publication.imageUrl} academy={publication.sourceName} className="absolute inset-0 h-full w-full" />
          </Link>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold tracking-wide text-pine uppercase">{kicker}</p>
            <FavoriteButton id={publication.id} />
          </div>
          <h3 className="text-xl leading-snug font-bold tracking-tight">
            <Link href={href} className="no-underline hover:text-pine">{publication.title}</Link>
          </h3>
          {publication.summary ? <p className="line-clamp-2 text-sm text-muted">{publication.summary}</p> : <p className="text-sm text-muted">Résumé non communiqué.</p>}
          <TagList publication={publication} />
        </div>
      </div>
    </article>
  );
}
