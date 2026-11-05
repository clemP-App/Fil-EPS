import Link from "next/link";
import { SyncButton } from "@/components/SyncButton";
import { createSourceAction } from "@/server/admin-actions";
import { formatDateTime } from "@/lib/dates";
import { methodLabel, statusLabel } from "@/lib/format";
import { getRepository } from "@/lib/app-db";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const sources = await (await getRepository()).listSources();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl">Sources</h1>
        <SyncButton label="Synchroniser les sources actives" />
      </div>
      {params.enregistre ? <p className="mt-4 text-pine">Modification enregistrée.</p> : null}
      {params.erreur === "source" ? <p className="mt-4 text-clay">Nom ou identifiant invalide.</p> : null}
      {params.erreur === "existe" ? <p className="mt-4 text-clay">Cet identifiant existe déjà.</p> : null}
      <div className="mt-6 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Méthode</th>
              <th>État</th>
              <th>Active</th>
              <th>Dernier succès</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td>
                  <p className="font-semibold">{source.name}</p>
                  <p className="text-sm text-muted">{source.feedUrl || source.homepageUrl || "Aucune URL"}</p>
                  {source.lastError ? <p className="text-sm text-clay">{source.lastError}</p> : null}
                </td>
                <td>{methodLabel(source.method)}</td>
                <td>{statusLabel(source.status)}</td>
                <td>{source.enabled ? "Oui" : "Non"}</td>
                <td>{source.lastSuccessAt ? formatDateTime(source.lastSuccessAt) : "—"}</td>
                <td className="space-y-2">
                  <Link className="text-pine underline" href={`/admin/sources/${source.slug}`}>Modifier</Link>
                  {source.enabled ? <SyncButton slug={source.slug} label="Cette source" /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="mt-10 max-w-xl">
        <h2 className="font-display text-3xl">Ajouter une source</h2>
        <form action={createSourceAction} className="mt-4 grid gap-3">
          <label>Identifiant<input name="slug" required pattern="[a-z0-9-]{2,64}" className="mt-1" /></label>
          <label>Nom<input name="name" required className="mt-1" /></label>
          <label>Type
            <select name="kind" className="mt-1"><option value="academie">Académie</option><option value="national">National</option></select>
          </label>
          <label>Groupe
            <select name="region" className="mt-1"><option value="metropole">Métropole</option><option value="outremer">Outre-mer</option><option value="national">National</option></select>
          </label>
          <label>Page d’accueil<input name="homepage" type="url" className="mt-1" /></label>
          <label>URL de collecte<input name="feed" type="url" className="mt-1" /></label>
          <label>Méthode
            <select name="method" className="mt-1"><option value="rss">RSS / Atom</option><option value="html">HTML</option><option value="sitemap">Sitemap</option></select>
          </label>
          <label className="flex items-center gap-2"><input className="w-auto" type="checkbox" name="enabled" /> Activer</label>
          <button type="submit">Créer</button>
        </form>
      </section>
    </div>
  );
}
