import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ShareButton } from "@/components/ShareButton";
import { Story, TagList } from "@/components/Story";
import { CoverImage } from "@/components/CoverImage";
import { formatDateTime, formatLongDate } from "@/lib/dates";
import { sourceKicker } from "@/lib/format";
import { getRepository } from "@/lib/app-db";
import { siteUrl } from "@/lib/constants";
import { isMembersArea } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const publication = await (await getRepository()).getPublication(id);
  if (!publication) return { title: "Publication introuvable" };
  const description = publication.summary ?? `Publication de ${publication.sourceName}. Le texte intégral reste sur le site d'origine.`;
  return {
    title: publication.title,
    description,
    alternates: { canonical: `/publication/${id}` },
    openGraph: {
      title: publication.title,
      description,
      type: "article",
      images: publication.imageUrl ? [{ url: publication.imageUrl }] : undefined,
    },
  };
}

export default async function PublicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepository();
  const publication = await repo.getPublication(id);
  if (!publication) notFound();
  const similar = await repo.listSimilar(publication, 4);
  const membersOnly = isMembersArea(publication.originalUrl, publication.categories);
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: publication.title,
    description: publication.summary,
    datePublished: publication.publishedAt ?? undefined,
    dateModified: publication.modifiedAt ?? undefined,
    author: { "@type": "Organization", name: sourceKicker(publication.sourceName, publication.sourceKind) },
    url: `${siteUrl()}/publication/${publication.id}`,
    sameAs: membersOnly ? undefined : publication.originalUrl,
    image: publication.imageUrl ?? undefined,
  };
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
      <p className="text-xs font-bold tracking-wide text-pine uppercase">{sourceKicker(publication.sourceName, publication.sourceKind)}</p>
      <h1 className="mt-3 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">{publication.title}</h1>
      <div className="mt-4 space-y-1 text-sm text-muted">
        <p>{publication.publishedAt ? <time dateTime={publication.publishedAt}>Publié le {formatLongDate(publication.publishedAt)}</time> : "Date de publication inconnue"}</p>
        {publication.modifiedAt ? <p>Mise à jour connue le {formatLongDate(publication.modifiedAt)}</p> : null}
        <p>Repérée le {formatDateTime(publication.discoveredAt)}</p>
      </div>
      {publication.imageUrl ? (
        <div className="surface my-6 overflow-hidden">
          <CoverImage src={publication.imageUrl} academy={publication.sourceName} className="h-72 w-full sm:h-96" />
        </div>
      ) : null}
      {publication.summary ? <p className="text-xl leading-relaxed">{publication.summary}</p> : <p className="text-muted">La source n’a pas fourni de résumé. Le texte intégral n’est pas reproduit ici.</p>}
      <div className="mt-5"><TagList publication={publication} /></div>
      {membersOnly ? (
        <p className="mt-8 rounded-2xl bg-chip px-4 py-3 text-sm">Ce document est réservé aux adhérents. Le site du SNEP-FSU demande un identifiant pour l’ouvrir.</p>
      ) : (
        <div className="mt-8">
          <a className="button" href={publication.originalUrl} target="_blank" rel="noopener noreferrer">
            {publication.sourceKind === "national" ? "Lire sur le site d'origine" : "Lire sur le site académique"}
            <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
          </a>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ShareButton title={publication.title} path={`/publication/${publication.id}`} />
        <FavoriteButton id={publication.id} />
      </div>
      <p className="mt-4 text-sm text-muted">{membersOnly ? "Le journal conserve le titre et l’extrait fournis par le flux. Le texte intégral reste sur le site source, derrière l’accès adhérent." : "Cette fiche rassemble le titre, un extrait et le lien d’origine. Le texte intégral reste sur le site source."}</p>
      <section className="mt-12">
        <h2 className="text-2xl font-extrabold tracking-tight">Ressources similaires</h2>
        {similar.length === 0 ? <p className="mt-2 text-muted">Aucune ressource proche n’a été repérée pour le moment.</p> : <div className="mt-2">{similar.map((item) => <Story key={item.id} publication={item} />)}</div>}
      </section>
      <p className="mt-8"><Link href="/" className="text-pine underline">Retour au journal</Link></p>
    </article>
  );
}
