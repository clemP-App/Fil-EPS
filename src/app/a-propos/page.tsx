import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "À propos",
  description: "Méthode, limites et règles de mise en avant de Fil EPS.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-4xl font-extrabold tracking-tight">À propos</h1>
      <div className="mt-6 space-y-5 text-lg">
        <p>Fil EPS est le journal des enseignantes et enseignants d’EPS. Il repère les nouvelles publications des sites académiques et renvoie vers l’original.</p>
        <p>Le collecteur préfère un flux RSS ou Atom. À défaut, il lit une page d’actualités avec un extracteur propre au site, ou un sitemap lorsque cette méthode est configurée. Il ne télécharge pas les documents, ne contourne pas les protections d’accès et s’arrête si robots.txt l’interdit.</p>
        <p>Une synchronisation ne reprend que les éléments récents exposés par la source, pas l’historique complet. Une même adresse canonique n’est enregistrée qu’une fois.</p>
        <p>La date de publication, la date de modification, la date de découverte et la date de dernière vérification sont conservées séparément. Si la source ne donne pas de date de publication, le journal affiche « date inconnue » plutôt que la date du jour.</p>
        <p>La classification repose sur des dictionnaires de mots-clés appliqués au titre, au résumé et aux catégories d’origine. Elle reste vide lorsque le texte ne contient pas de signal suffisant. Une correction faite dans l’administration n’est plus écrasée automatiquement.</p>
        <p>La une n’est pas une sélection humaine. L’article principal est choisi parmi les quarante plus récentes publications : d’abord celles qui ont une illustration et un résumé d’au moins 80 caractères, puis celles qui ont ce résumé, puis la plus récente. Les cartes suivantes privilégient la diversité des académies.</p>
        <p>Les marques-pages, les académies suivies et le thème d’affichage sont enregistrés dans le navigateur. Aucun compte n’est demandé.</p>
        <p>Le flux <Link className="text-pine underline" href="/rss.xml">/rss.xml</Link> reprend les dernières fiches du portail. Des variantes filtrées existent, par exemple <Link className="text-pine underline" href="/rss?apsa=badminton">/rss?apsa=badminton</Link>.</p>
      </div>
    </div>
  );
}
