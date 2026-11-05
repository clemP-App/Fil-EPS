import Link from "next/link";
import { ActiveFilters, FilterPanel } from "@/components/FilterPanel";
import { Story } from "@/components/Story";
import { filtersToQuery, toQueryParts, type PublicFilters } from "@/lib/filters";
import { countLabel } from "@/lib/format";
import { getRepository } from "@/lib/app-db";

export async function ResultsView({ filters, pathname }: { filters: PublicFilters; pathname: string }) {
  const repo = await getRepository();
  const parts = toQueryParts(filters);
  const result = await repo.listPublications(parts);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-4xl font-extrabold tracking-tight">Recherche</h1>
        <p className="mt-2 text-muted">{countLabel(result.total, "publication", "publications")}</p>
      </header>
      <FilterPanel filters={filters} action={pathname} />
      <ActiveFilters filters={filters} pathname={pathname} />
      {result.items.length === 0 ? (
        <p className="surface p-6">Aucune publication ne correspond à ces critères. Élargissez la période, retirez un filtre, ou vérifiez qu’une synchronisation a déjà eu lieu.</p>
      ) : (
        <div>
          {result.items.map((publication) => (
            <Story key={publication.id} publication={publication} />
          ))}
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label="Pages de résultats" className="flex flex-wrap items-center gap-4">
          {filters.page > 1 ? <Link className="button secondary" href={`${pathname}${filtersToQuery(filters, { page: filters.page - 1 })}`}>Page précédente</Link> : null}
          <p>Page {filters.page} sur {pages}</p>
          {filters.page < pages ? <Link className="button" href={`${pathname}${filtersToQuery(filters, { page: filters.page + 1 })}`}>Afficher davantage</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
