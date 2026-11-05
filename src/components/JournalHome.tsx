import Link from "next/link";
import { FilterPanel } from "@/components/FilterPanel";
import { Story } from "@/components/Story";
import { formatDateTime } from "@/lib/dates";
import { selectFeatured } from "@/lib/featuring";
import { EMPTY_FILTERS } from "@/lib/filters";
import { countLabel } from "@/lib/format";
import { getRepository } from "@/lib/app-db";
import { RUBRICS } from "@/lib/taxonomy";

export async function JournalHome() {
  const repo = await getRepository();
  const [stats, recent, sources] = await Promise.all([
    repo.stats(),
    repo.listPublications({ page: 1, pageSize: 60, sort: "date" }),
    repo.listSources(),
  ]);
  const featured = selectFeatured(recent.items);
  const exclude = [featured.lead?.id, ...featured.secondary.map((item) => item.id)].filter((id): id is string => Boolean(id));
  const rubrics = [];
  for (const rubric of RUBRICS) {
    const items = await repo.listRubric(rubric, 3, exclude);
    if (items.length > 0) rubrics.push({ rubric, items });
  }
  const enabled = sources.filter((source) => source.enabled);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">À lire en ce moment</h1>
          <p className="mt-2 max-w-2xl text-muted">Les publications récentes des sites d’EPS, avec le lien vers l’original.</p>
        </div>
        <p className="text-sm text-muted">
          {countLabel(stats.total, "publication", "publications")}
          <span className="mx-2">·</span>
          {stats.lastSuccessAt ? `mise à jour ${formatDateTime(stats.lastSuccessAt)}` : "pas encore synchronisé"}
        </p>
      </header>
      {stats.total === 0 ? (
        <section className="surface p-6">
          <h2 className="text-3xl font-extrabold tracking-tight">Aucune publication collectée</h2>
          <p className="mt-2 max-w-2xl">Le journal n’affiche pas d’exemples fictifs. Lancez une synchronisation pour interroger les sources dont l’adresse a été vérifiée.</p>
          <p className="mt-3 text-sm text-muted">{countLabel(enabled.length, "source activée", "sources activées")} sur {sources.length} académies et organismes prévus.</p>
        </section>
      ) : (
        <>
          {featured.lead ? <Story publication={featured.lead} variant="lead" /> : null}
          {featured.secondary.length > 0 ? (
            <section aria-label="Articles secondaires">
              <div className="grid gap-4 md:grid-cols-2">
                {featured.secondary.map((publication) => (
                  <Story key={publication.id} publication={publication} variant="card" />
                ))}
              </div>
            </section>
          ) : null}
          <details className="surface px-4 py-3">
            <summary className="font-semibold">Affiner le journal</summary>
            <div className="pt-4">
              <FilterPanel filters={EMPTY_FILTERS} action="/recherche" bare />
            </div>
          </details>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
            <section>
              <h2 className="text-2xl font-extrabold tracking-tight">Le fil</h2>
              {featured.rest.length === 0 ? <p className="mt-3 text-muted">Les publications récentes sont déjà affichées ci-dessus.</p> : featured.rest.slice(0, 12).map((publication) => <Story key={publication.id} publication={publication} />)}
              <Link href="/recherche" className="button mt-5">Toutes les publications</Link>
            </section>
            <aside className="flex flex-col gap-6">
              {rubrics.map(({ rubric, items }) => (
                <section key={rubric.slug} className="surface p-4">
                  <h2 className="text-lg font-bold tracking-tight">{rubric.title}</h2>
                  <p className="mb-2 text-sm text-muted">{rubric.description}</p>
                  <ul className="space-y-3">
                    {items.map((publication) => (
                      <li key={publication.id}>
                        <Link href={`/publication/${publication.id}`} className="font-semibold no-underline hover:text-pine">{publication.title}</Link>
                        <p className="text-xs text-muted">{publication.sourceName}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <section className="surface p-4">
                <h2 className="text-lg font-bold tracking-tight">Sources</h2>
                <p className="mt-2 text-sm text-muted">{countLabel(enabled.length, "site suivi", "sites suivis")}, académies et organismes nationaux.</p>
                <Link href="/sources" className="mt-3 inline-block text-sm font-semibold text-pine no-underline hover:underline">Voir les sources</Link>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
