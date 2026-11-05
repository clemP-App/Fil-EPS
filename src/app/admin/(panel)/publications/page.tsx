import Link from "next/link";
import { parsePublicFilters, toQueryParts } from "@/lib/filters";
import { formatLongDate } from "@/lib/dates";
import { getRepository } from "@/lib/app-db";

export const dynamic = "force-dynamic";

export default async function AdminPublicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = parsePublicFilters(params);
  const parts = toQueryParts(filters);
  const result = await (await getRepository()).listPublications({ ...parts, includeHidden: true, includeDemo: true, pageSize: 30 });
  return (
    <div>
      <h1 className="font-display text-4xl">Publications</h1>
      <form className="mt-4 flex max-w-xl gap-2" method="get">
        <label className="sr-only" htmlFor="admin-q">Rechercher</label>
        <input id="admin-q" name="q" defaultValue={filters.q} />
        <button type="submit">Filtrer</button>
      </form>
      <p className="mt-3 text-sm text-muted">{result.total.toLocaleString("fr-FR")} fiches, y compris les publications masquées.</p>
      <div className="mt-4 overflow-x-auto">
        <table>
          <thead>
            <tr><th>Titre</th><th>Source</th><th>Date</th><th>État</th></tr>
          </thead>
          <tbody>
            {result.items.map((publication) => (
              <tr key={publication.id}>
                <td><Link className="font-semibold text-pine underline" href={`/admin/publications/${publication.id}`}>{publication.title}</Link></td>
                <td>{publication.sourceName}</td>
                <td>{publication.publishedAt ? formatLongDate(publication.publishedAt) : "Date inconnue"}</td>
                <td>{publication.status === "hidden" ? "Masquée" : "Visible"}{publication.isDemo ? " · fictif" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
