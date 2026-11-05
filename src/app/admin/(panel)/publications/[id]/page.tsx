import { notFound } from "next/navigation";
import { classificationAction } from "@/server/admin-actions";
import { getRepository } from "@/lib/app-db";
import { APSAS, CONTENT_TYPES, LEVELS, THEMES } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function AdminPublicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const publication = await (await getRepository()).getPublication(id, { includeHidden: true, includeDemo: true });
  if (!publication) notFound();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl">{publication.title}</h1>
      <p className="mt-2 text-muted">{publication.sourceName} · {publication.status === "hidden" ? "Masquée" : "Visible"}{publication.classificationLocked ? " · classification verrouillée" : ""}</p>
      {query.enregistre ? <p className="mt-3 text-pine">Modification enregistrée.</p> : null}
      <p className="mt-4"><a className="text-pine underline" href={publication.originalUrl}>Ouvrir la source</a></p>
      <form action={classificationAction} className="mt-6 grid gap-4">
        <input type="hidden" name="id" value={publication.id} />
        <CheckList title="Thèmes" name="themes" options={THEMES} selected={publication.themes.map((term) => term.slug)} />
        <CheckList title="APSA" name="apsas" options={APSAS} selected={publication.apsas.map((term) => term.slug)} />
        <CheckList title="Niveaux" name="levels" options={LEVELS} selected={publication.levels.map((term) => term.slug)} />
        <label>Type
          <select name="contentType" defaultValue={publication.contentType ?? ""} className="mt-1">
            <option value="">Non précisé</option>
            {CONTENT_TYPES.map((type) => <option key={type.slug} value={type.slug}>{type.label}</option>)}
          </select>
        </label>
        <label>Tags, séparés par des virgules
          <input name="tags" defaultValue={publication.tags.map((tag) => tag.label).join(", ")} className="mt-1" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="intent" value="save">Enregistrer et verrouiller</button>
          <button type="submit" className="secondary" name="intent" value="reclassify">Relancer la classification</button>
          {publication.status === "hidden" ? (
            <button type="submit" className="secondary" name="intent" value="show">Rendre visible</button>
          ) : (
            <button type="submit" className="secondary" name="intent" value="hide">Masquer</button>
          )}
        </div>
      </form>
    </div>
  );
}

function CheckList({ title, name, options, selected }: { title: string; name: string; options: Array<{ slug: string; label: string }>; selected: string[] }) {
  return (
    <fieldset>
      <legend className="font-semibold">{title}</legend>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {options.map((option) => (
          <li key={option.slug}>
            <label className="flex gap-2 text-sm">
              <input className="mt-1 w-auto" type="checkbox" name={name} value={option.slug} defaultChecked={selected.includes(option.slug)} />
              {option.label}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
