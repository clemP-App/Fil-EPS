import type { Metadata } from "next";
import { formatDateTime } from "@/lib/dates";
import { countLabel, methodLabel, statusLabel } from "@/lib/format";
import { getRepository } from "@/lib/app-db";
import { REGION_LABELS } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sources",
  description: "État des sources académiques suivies par Fil EPS.",
};

export default async function SourcesPage() {
  const sources = await (await getRepository()).listSources();
  const groups = ["metropole", "outremer", "national"] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl font-extrabold tracking-tight">Sources</h1>
      <p className="mt-3 max-w-3xl text-muted">Chaque académie et chaque organisme national est prévu dans le journal. Seules les adresses réellement vérifiées sont collectées. Les autres restent visibles ici, sans URL inventée.</p>
      {groups.map((group) => (
        <section key={group} className="mt-8">
          <h2 className="text-2xl font-extrabold tracking-tight">{REGION_LABELS[group]}</h2>
          <div className="mt-3 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Méthode</th>
                  <th>État</th>
                  <th>Publications</th>
                  <th>Dernier succès</th>
                </tr>
              </thead>
              <tbody>
                {sources.filter((source) => source.regionGroup === group).map((source) => (
                  <tr key={source.id}>
                    <td>
                      <p className="font-semibold">{source.name}</p>
                      {source.homepageUrl ? <a className="text-sm text-pine underline" href={source.homepageUrl}>{source.homepageUrl}</a> : <p className="text-sm text-muted">Adresse non confirmée</p>}
                      {source.lastError ? <p className="text-sm text-clay">{source.lastError}</p> : null}
                    </td>
                    <td>{source.enabled ? methodLabel(source.method) : "—"}</td>
                    <td>{statusLabel(source.status)}</td>
                    <td>{countLabel(source.publicationCount ?? 0, "publication", "publications")}</td>
                    <td>{source.lastSuccessAt ? formatDateTime(source.lastSuccessAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
