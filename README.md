# Fil EPS

Journal numérique des publications académiques d’EPS. L’application indexe des métadonnées (titre, extrait court, URL, dates, illustration éventuelle) et renvoie vers le site d’origine. Elle ne republie pas le texte intégral et n’invente pas de publications.

## Choix techniques

Une seule application Next.js (App Router, React, TypeScript, Tailwind CSS) sert le journal, l’administration, l’API et le collecteur. Le collecteur est en TypeScript pour partager la déduplication, la classification et le schéma avec le site.

Les données locales sont dans SQLite (`data/veille.db`, ignoré par git) via `node:sqlite`. Si `DATABASE_URL` commence par `postgres`, le même SQL passe par PostgreSQL. La migration `supabase/migrations/001_init.sql` prépare Supabase : les rôles `anon` et `authenticated` n’ont aucun droit, les écritures passent uniquement par la connexion serveur.

`data/catalog.json` est un instantané des métadonnées réellement collectées. Au premier démarrage, si la base est vide, cet instantané est importé. Les lignes marquées démonstration existent seulement pour les tests et portent le préfixe `[FICTIF]`.

## Démarrage

```bash
npm install
npm run sync
npm run dev
```

Le journal est alors sur http://localhost:3000. `npm test` lance les tests, `npm run build` prépare la production.

Copier `.env.example` vers `.env.local` pour l’administration. Sans `ADMIN_SECRET` et `ADMIN_PASSWORD`, la connexion `/admin/login` reste fermée. Ces valeurs ne doivent jamais être préfixées par `NEXT_PUBLIC_`.

## Sources vérifiées

Les adresses ci-dessous ont été lues les 4 et 5 novembre 2026. Les autres académies sont présentes dans les filtres, sans URL inventée, et restent désactivées (`non configurée`).

| Source | Méthode | Adresse de collecte |
| --- | --- | --- |
| AEEPS | HTML | https://www.aeeps.org/news |
| Aix-Marseille | RSS | https://www.pedagogie.ac-aix-marseille.fr/feed/Rss2.jsp?id=c_168668 |
| Amiens | RSS | https://pedagogie.ac-amiens.fr/eps/feed/ |
| Besançon | RSS | https://eps.ac-besancon.fr/feed/ |
| Clermont-Ferrand | RSS | https://pedagogie.ac-clermont.fr/disciplines/education-physique-et-sportive/feed/ |
| Corse | RSS | https://sites.ac-corse.fr/eps/feed/ |
| Créteil | RSS | https://eps.ac-creteil.fr/spip.php?page=backend |
| Dijon | RSS | https://eps.wp.ac-dijon.fr/feed/ |
| Grenoble | HTML | https://eps-pedagogie.web.ac-grenoble.fr/fil-dactualites |
| Guadeloupe | RSS | https://pedagogie.ac-guadeloupe.fr/group/5423/rss.xml |
| Guyane | RSS | https://eps.dis.ac-guyane.fr/spip.php?page=backend |
| Lille | RSS | https://pedagogie.ac-lille.fr/eps/feed/ |
| Limoges | RSS | https://pedagogie.ac-limoges.fr/eps/spip.php?page=backend |
| Lyon | RSS | https://eps.enseigne.ac-lyon.fr/spip/spip.php?page=backend |
| Montpellier | HTML | https://pedagogie.ac-montpellier.fr/discipline/education-physique-et-sportive |
| Nantes | HTML | https://pedagogie.ac-nantes.fr/les-disciplines-du-second-degre/education-physique-et-sportive/enseigner/revue-e-nov-eps-publications-du-gaip-1 |
| Nice | RSS | https://www.pedagogie.ac-nice.fr/eps/feed/ |
| Normandie | RSS | https://eps.ac-normandie.fr/spip.php?page=backend |
| Nouvelle-Calédonie | RSS | https://eps.ac-noumea.nc/spip.php?page=backend |
| Paris | HTML | https://pia.ac-paris.fr/portail/jcms/p2_1452454/ressources |
| Poitiers | HTML | https://ww2.ac-poitiers.fr/eps/ |
| Polynésie française | RSS | https://eps.education.pf/feed/ |
| Rennes | RSS | https://pedagogie.ac-rennes.fr/spip.php?page=backend&id_rubrique=1856 |
| SNEP-FSU | RSS | https://lesite.snepfsu.fr/feed/ |
| Strasbourg | HTML | https://pedagogie.ac-strasbourg.fr/eps/toutes-les-actualites |
| Toulouse | RSS | https://pedagogie.ac-toulouse.fr/education-physique-et-sportive/path/rss.xml/31/6 |
| Tube EPS | RSS | https://tube-education-physique-et-sportive.apps.education.fr/feeds/videos.xml?isLocal=true |
| Versailles | RSS | https://eps.ac-versailles.fr/spip.php?page=backend |

Le flux de Besançon n’expose actuellement qu’un seul élément. Poitiers, Grenoble, Montpellier, Strasbourg, Paris, Nantes et l’AEEPS n’ont pas de flux exploitable : une page d’actualités ou de ressources est lue avec un extracteur limité aux articles. Les actualités AEEPS n’affichent pas de date de publication : elle reste inconnue. Le flux de Rennes est celui de la rubrique EPS, pas celui de tout le portail. Tube EPS est le portail vidéo PeerTube d’apps.education.fr ; seules les vidéos locales de l’instance sont reprises. Le SNEP-FSU est repris par le flux public du site. Le sitemap est implémenté, mais aucune source vérifiée ne l’utilise, pour ne pas mélanger l’EPS avec les autres disciplines d’un site académique.

Le flux d’Aix-Marseille est limité au site disciplinaire EPS. Les lettres d’information présentes sur l’accueil n’y figurent pas. Dijon et Nice ont un flux WordPress EPS dont le certificat a été validé le 5 novembre 2026. Nantes reprend uniquement les cartes récentes de la revue e-novEPS (publications du GAIP), avec leur date éditoriale. L’onglet des anciens numéros n’est pas collecté : certaines cases n’ont pas de lien, et la date de mise en ligne de la page est distincte de la date éditoriale, visible seulement dans la publication. La Polynésie française est le flux du bureau EPS de la DGEE. Les entrées lues portent sur l’EPS, l’activité physique ou le sport scolaire. Le même site publie aussi sur la sûreté des écoles, et l’adresse du flux ne contient pas de filtre exclusif. La page EPS du vice-rectorat reste en HTTP 403.

Huit sources restent désactivées. La vérification du 5 novembre 2026 a ouvert les cinq collectes ci-dessus et confirmé les blocages restants. Le collecteur ne désactive pas la vérification TLS, ne contourne pas un refus d’accès et respecte `robots.txt`.

| Source | Adresse ouverte | Blocage |
| --- | --- | --- |
| Bordeaux | https://ent2d.ac-bordeaux.fr/disciplines/eps/feed/ | certificat expiré, aucune autre adresse validée |
| Nancy-Metz | https://sites.ac-nancy-metz.fr/eps/wp/ | HTTP 404, y compris l’ancien WordPress, son flux et le portail d’inspection |
| Orléans-Tours | https://pedagogie.ac-orleans-tours.fr/spip.php?rubrique2375 | HTTP 503, site en travaux |
| Reims | https://pedagogie.ac-reims.fr/ | délai dépassé, y compris la rubrique « Se former EPS Lycée » |
| Martinique | https://site.ac-martinique.fr/eps/ | accueil lisible, mais `/feed/` renvoie du HTML et les listes n’ont pas de date homogène |
| Mayotte | https://eps.ac-mayotte.fr/ | certificat non valable pour le nom `eps.ac-mayotte.fr` |
| La Réunion | https://www.ac-reunion.fr/education-physique-et-sportive-2nd-degre-126428 | HTTP 403 |
| Éduscol | https://edubase.eduscol.education.fr/rss/rss.xml?discipline[0]=%C3%89ducation%20Physique%20et%20Sportive | flux EPS en HTTP 200, refusé par `robots.txt` (`User-agent: *` / `Disallow: /`) ; le portail disciplinaire reste en HTTP 403 |

Le robot s’identifie, respecte `robots.txt`, espace ses requêtes et ne reprend que les éléments récents de chaque source.

## Ce qui fonctionne

- Journal, recherche, filtres combinables, fiche, favoris locaux, « Ma veille », mode sombre.
- Synchronisation réelle, déduplication, classification par mots-clés, correction verrouillée dans l’administration.
- Flux `/rss.xml` et `/rss` filtré par `theme`, `academie` ou `apsa`.
- Administration protégée par cookie signé : sources, synchronisation manuelle, catégories, masquage.

## Ce qui demande encore une configuration

- Renseigner `DATABASE_URL` (et `DATABASE_SSL=require` chez Supabase) pour une base durable. Sans cela, un hébergement sans disque persistant repart de `data/catalog.json` à chaque instance.
- Déposer `DATABASE_URL` dans les secrets GitHub pour la synchronisation quotidienne (`.github/workflows/sync.yml`, 04:15 UTC). Sans ce secret, le workflow exécute les tests et n’appelle pas les sites.
- Ajouter les académies restantes dans `src/collector/verified-sources.ts` seulement après vérification de leur flux ou de leur page. `npm run sync -- lyon` limite la collecte à une source.
