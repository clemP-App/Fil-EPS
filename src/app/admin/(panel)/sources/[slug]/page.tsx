import { notFound } from "next/navigation";
import { updateSourceAction } from "@/server/admin-actions";
import { getRepository } from "@/lib/app-db";

export const dynamic = "force-dynamic";

export default async function EditSourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const source = await (await getRepository()).getSource(slug);
  if (!source) notFound();
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-4xl">{source.name}</h1>
      {query.erreur === "config" ? <p className="mt-3 text-clay">La configuration doit être un objet JSON.</p> : null}
      <form action={updateSourceAction} className="mt-6 grid gap-3">
        <input type="hidden" name="slug" value={source.slug} />
        <label>Page d’accueil<input name="homepage" type="url" defaultValue={source.homepageUrl ?? ""} className="mt-1" /></label>
        <label>URL de flux ou de page<input name="feed" type="url" defaultValue={source.feedUrl ?? ""} className="mt-1" /></label>
        <label>Méthode
          <select name="method" defaultValue={source.method} className="mt-1">
            <option value="rss">RSS / Atom</option>
            <option value="html">HTML</option>
            <option value="sitemap">Sitemap</option>
          </select>
        </label>
        <label className="flex items-center gap-2"><input className="w-auto" type="checkbox" name="enabled" defaultChecked={source.enabled} /> Source active</label>
        <label>Configuration JSON
          <textarea name="config" rows={10} className="mt-1 font-mono text-sm" defaultValue={JSON.stringify(source.config, null, 2)} />
        </label>
        <button type="submit">Enregistrer</button>
      </form>
      <p className="mt-4 text-sm text-muted">Enregistrer marque la source comme personnalisée : les mises à jour du code ne remplaceront plus son adresse.</p>
    </div>
  );
}
