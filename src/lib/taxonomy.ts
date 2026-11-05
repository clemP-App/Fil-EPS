export type Term = { slug: string; label: string };
export type Phrase = { pattern: string; tag?: string };
export type TermRule = Term & { phrases: Phrase[] };

export const ACADEMIES: Array<Term & { kind: "academie" | "national"; regionGroup: "metropole" | "outremer" | "national" }> = [
  { slug: "aix-marseille", label: "Aix-Marseille", kind: "academie", regionGroup: "metropole" },
  { slug: "amiens", label: "Amiens", kind: "academie", regionGroup: "metropole" },
  { slug: "besancon", label: "Besançon", kind: "academie", regionGroup: "metropole" },
  { slug: "bordeaux", label: "Bordeaux", kind: "academie", regionGroup: "metropole" },
  { slug: "clermont-ferrand", label: "Clermont-Ferrand", kind: "academie", regionGroup: "metropole" },
  { slug: "corse", label: "Corse", kind: "academie", regionGroup: "metropole" },
  { slug: "creteil", label: "Créteil", kind: "academie", regionGroup: "metropole" },
  { slug: "dijon", label: "Dijon", kind: "academie", regionGroup: "metropole" },
  { slug: "grenoble", label: "Grenoble", kind: "academie", regionGroup: "metropole" },
  { slug: "lille", label: "Lille", kind: "academie", regionGroup: "metropole" },
  { slug: "limoges", label: "Limoges", kind: "academie", regionGroup: "metropole" },
  { slug: "lyon", label: "Lyon", kind: "academie", regionGroup: "metropole" },
  { slug: "montpellier", label: "Montpellier", kind: "academie", regionGroup: "metropole" },
  { slug: "nancy-metz", label: "Nancy-Metz", kind: "academie", regionGroup: "metropole" },
  { slug: "nantes", label: "Nantes", kind: "academie", regionGroup: "metropole" },
  { slug: "nice", label: "Nice", kind: "academie", regionGroup: "metropole" },
  { slug: "normandie", label: "Normandie", kind: "academie", regionGroup: "metropole" },
  { slug: "orleans-tours", label: "Orléans-Tours", kind: "academie", regionGroup: "metropole" },
  { slug: "paris", label: "Paris", kind: "academie", regionGroup: "metropole" },
  { slug: "poitiers", label: "Poitiers", kind: "academie", regionGroup: "metropole" },
  { slug: "reims", label: "Reims", kind: "academie", regionGroup: "metropole" },
  { slug: "rennes", label: "Rennes", kind: "academie", regionGroup: "metropole" },
  { slug: "strasbourg", label: "Strasbourg", kind: "academie", regionGroup: "metropole" },
  { slug: "toulouse", label: "Toulouse", kind: "academie", regionGroup: "metropole" },
  { slug: "versailles", label: "Versailles", kind: "academie", regionGroup: "metropole" },
  { slug: "guadeloupe", label: "Guadeloupe", kind: "academie", regionGroup: "outremer" },
  { slug: "guyane", label: "Guyane", kind: "academie", regionGroup: "outremer" },
  { slug: "martinique", label: "Martinique", kind: "academie", regionGroup: "outremer" },
  { slug: "mayotte", label: "Mayotte", kind: "academie", regionGroup: "outremer" },
  { slug: "nouvelle-caledonie", label: "Nouvelle-Calédonie", kind: "academie", regionGroup: "outremer" },
  { slug: "polynesie", label: "Polynésie française", kind: "academie", regionGroup: "outremer" },
  { slug: "reunion", label: "La Réunion", kind: "academie", regionGroup: "outremer" },
  { slug: "aeeps", label: "AEEPS", kind: "national", regionGroup: "national" },
  { slug: "eduscol", label: "Éduscol", kind: "national", regionGroup: "national" },
  { slug: "snep-fsu", label: "SNEP-FSU", kind: "national", regionGroup: "national" },
  { slug: "tube-eps", label: "Tube EPS", kind: "national", regionGroup: "national" },
];

export const THEMES: TermRule[] = [
  { slug: "numerique-educatif", label: "Numérique éducatif", phrases: [{ pattern: "numerique" }, { pattern: "tablette" }, { pattern: "outil numerique" }, { pattern: "usages numeriques" }, { pattern: "tice" }, { pattern: "qr code" }, { pattern: "genially" }, { pattern: "padlet" }, { pattern: "smartphone" }, { pattern: "capsule video" }, { pattern: "baladodiffusion" }, { pattern: "classe inversee" }] },
  { slug: "intelligence-artificielle", label: "Intelligence artificielle", phrases: [{ pattern: "intelligence artificielle" }, { pattern: "ia generative" }, { pattern: "ia" }, { pattern: "chatgpt" }] },
  { slug: "ressources-pedagogiques", label: "Ressources pédagogiques", phrases: [{ pattern: "ressource pedagogique" }, { pattern: "scenario pedagogique" }, { pattern: "situation d'apprentissage" }, { pattern: "situation d apprentissage" }, { pattern: "fiche pedagogique" }, { pattern: "banque de ressources" }] },
  { slug: "evaluation", label: "Évaluation", phrases: [{ pattern: "evaluation" }, { pattern: "afl" }, { pattern: "afl1" }, { pattern: "afl2" }, { pattern: "afl3" }, { pattern: "ccf" }, { pattern: "referentiel" }, { pattern: "notation" }, { pattern: "protocole d evaluation" }] },
  { slug: "examens-certifications", label: "Examens et certifications", phrases: [{ pattern: "baccalaureat" }, { pattern: "examen" }, { pattern: "certification" }, { pattern: "epreuve" }, { pattern: "cyclades" }, { pattern: "santorin" }, { pattern: "ipackeps" }, { pattern: "ccf" }, { pattern: "diplome national du brevet" }, { pattern: "dnb" }] },
  { slug: "programmes", label: "Programmes", phrases: [{ pattern: "programme d eps" }, { pattern: "programmes d eps" }, { pattern: "programme officiel" }, { pattern: "programmes officiels" }, { pattern: "nouveau programme" }] },
  { slug: "formation", label: "Formation", phrases: [{ pattern: "formation" }, { pattern: "webinaire" }, { pattern: "magistere" }, { pattern: "plan academique de formation" }] },
  { slug: "inclusion", label: "Inclusion", phrases: [{ pattern: "inclusion" }, { pattern: "ecole inclusive" }, { pattern: "besoins educatifs particuliers" }, { pattern: "accessibilite" }, { pattern: "ebep" }] },
  { slug: "eps-adaptee", label: "EPS adaptée", phrases: [{ pattern: "eps adaptee" }, { pattern: "aptitude partielle" }, { pattern: "inaptitude" }] },
  { slug: "securite", label: "Sécurité", phrases: [{ pattern: "securite" }, { pattern: "protocole de securite" }, { pattern: "surveillance des baignades" }, { pattern: "premiers secours" }] },
  { slug: "recherche", label: "Recherche", phrases: [{ pattern: "recherche en eps" }, { pattern: "travaux de recherche" }, { pattern: "colloque" }, { pattern: "article scientifique" }] },
  { slug: "innovations-pedagogiques", label: "Innovations pédagogiques", phrases: [{ pattern: "innovation pedagogique" }, { pattern: "experimentation" }, { pattern: "traam" }, { pattern: "pratiques innovantes" }] },
  { slug: "unss-sport-scolaire", label: "UNSS et sport scolaire", phrases: [{ pattern: "unss" }, { pattern: "sport scolaire" }, { pattern: "association sportive" }] },
  { slug: "autres", label: "Autres", phrases: [] },
];

export const APSAS: TermRule[] = [
  { slug: "athletisme", label: "Athlétisme", phrases: [{ pattern: "athletisme" }, { pattern: "demi-fond", tag: "Demi-fond" }, { pattern: "demi fond", tag: "Demi-fond" }, { pattern: "course en duree", tag: "Course en durée" }, { pattern: "course de duree", tag: "Course en durée" }, { pattern: "saut en hauteur" }, { pattern: "saut en longueur" }, { pattern: "triple saut" }, { pattern: "lancer de poids" }, { pattern: "haies" }] },
  { slug: "natation", label: "Natation", phrases: [{ pattern: "natation" }, { pattern: "savoir-nager", tag: "Savoir-nager" }, { pattern: "savoir nager", tag: "Savoir-nager" }] },
  { slug: "badminton", label: "Badminton", phrases: [{ pattern: "badminton" }] },
  { slug: "tennis-de-table", label: "Tennis de table", phrases: [{ pattern: "tennis de table" }, { pattern: "tennis-de-table" }] },
  { slug: "tennis", label: "Tennis", phrases: [{ pattern: "tennis" }] },
  { slug: "volley-ball", label: "Volley-ball", phrases: [{ pattern: "volley-ball" }, { pattern: "volley ball" }, { pattern: "volleyball" }] },
  { slug: "basket-ball", label: "Basket-ball", phrases: [{ pattern: "basket-ball" }, { pattern: "basket ball" }, { pattern: "basketball" }, { pattern: "basket" }] },
  { slug: "handball", label: "Handball", phrases: [{ pattern: "handball" }, { pattern: "hand-ball" }] },
  { slug: "football", label: "Football", phrases: [{ pattern: "football" }, { pattern: "foot" }] },
  { slug: "rugby", label: "Rugby", phrases: [{ pattern: "rugby" }] },
  { slug: "ultimate", label: "Ultimate", phrases: [{ pattern: "ultimate" }] },
  { slug: "gymnastique", label: "Gymnastique", phrases: [{ pattern: "gymnastique" }] },
  { slug: "acrosport", label: "Acrosport", phrases: [{ pattern: "acrosport" }, { pattern: "acrogym" }] },
  { slug: "danse", label: "Danse", phrases: [{ pattern: "danse" }] },
  { slug: "arts-du-cirque", label: "Arts du cirque", phrases: [{ pattern: "arts du cirque" }, { pattern: "cirque" }] },
  { slug: "escalade", label: "Escalade", phrases: [{ pattern: "escalade" }] },
  { slug: "course-orientation", label: "Course d'orientation", phrases: [{ pattern: "course d'orientation" }, { pattern: "course d orientation" }] },
  { slug: "musculation", label: "Musculation", phrases: [{ pattern: "musculation" }] },
  { slug: "step", label: "Step", phrases: [{ pattern: "step" }] },
  { slug: "yoga", label: "Yoga", phrases: [{ pattern: "yoga" }] },
  { slug: "boxe", label: "Boxe", phrases: [{ pattern: "boxe" }, { pattern: "boxe francaise" }] },
  { slug: "judo", label: "Judo", phrases: [{ pattern: "judo" }] },
  { slug: "escrime", label: "Escrime", phrases: [{ pattern: "escrime" }] },
  { slug: "cyclisme", label: "Cyclisme", phrases: [{ pattern: "cyclisme" }, { pattern: "vtt" }, { pattern: "velo tout terrain" }] },
  { slug: "water-polo", label: "Water-polo", phrases: [{ pattern: "water-polo" }, { pattern: "water polo" }] },
  { slug: "sauvetage", label: "Sauvetage", phrases: [{ pattern: "sauvetage aquatique" }, { pattern: "sauvetage" }] },
  { slug: "kayak", label: "Kayak", phrases: [{ pattern: "kayak" }, { pattern: "canoe-kayak" }, { pattern: "canoe kayak" }] },
  { slug: "aviron", label: "Aviron", phrases: [{ pattern: "aviron" }] },
];

export const LEVELS: TermRule[] = [
  { slug: "cycle-3", label: "Cycle 3", phrases: [{ pattern: "cycle 3" }] },
  { slug: "cycle-4", label: "Cycle 4", phrases: [{ pattern: "cycle 4" }] },
  { slug: "college", label: "Collège", phrases: [{ pattern: "college" }, { pattern: "6e" }, { pattern: "5e" }, { pattern: "4e" }, { pattern: "3e" }] },
  { slug: "lycee-gt", label: "Lycée GT", phrases: [{ pattern: "lycee general" }, { pattern: "lycee technologique" }, { pattern: "voie generale" }, { pattern: "voie technologique" }, { pattern: "bac general" }, { pattern: "bac technologique" }] },
  { slug: "lycee-professionnel", label: "Lycée professionnel", phrases: [{ pattern: "lycee professionnel" }, { pattern: "lycee pro" }, { pattern: "voie professionnelle" }, { pattern: "bac pro" }, { pattern: "baccalaureat professionnel" }] },
  { slug: "cap", label: "CAP", phrases: [{ pattern: "cap" }] },
  { slug: "enseignement-specialite", label: "Enseignement de spécialité", phrases: [{ pattern: "enseignement de specialite" }, { pattern: "specialite eps" }] },
  { slug: "tous-niveaux", label: "Tous niveaux", phrases: [{ pattern: "tous niveaux" }, { pattern: "tous les niveaux" }] },
];

export const CONTENT_TYPES: Term[] = [
  { slug: "article", label: "Article" },
  { slug: "ressource-pedagogique", label: "Ressource pédagogique" },
  { slug: "fiche-seance", label: "Fiche de séance" },
  { slug: "sequence", label: "Séquence" },
  { slug: "outil-numerique", label: "Outil numérique" },
  { slug: "video", label: "Vidéo" },
  { slug: "pdf", label: "PDF" },
  { slug: "document-institutionnel", label: "Document institutionnel" },
  { slug: "formation", label: "Formation" },
  { slug: "webinaire", label: "Webinaire" },
];

export const CONTENT_RULES: TermRule[] = [
  { slug: "webinaire", label: "Webinaire", phrases: [{ pattern: "webinaire" }, { pattern: "webinar" }] },
  { slug: "video", label: "Vidéo", phrases: [{ pattern: "capsule video" }, { pattern: "video pedagogique" }, { pattern: "tutoriel video" }] },
  { slug: "fiche-seance", label: "Fiche de séance", phrases: [{ pattern: "fiche de seance" }, { pattern: "fiche seance" }] },
  { slug: "sequence", label: "Séquence", phrases: [{ pattern: "sequence d apprentissage" }, { pattern: "sequence pedagogique" }, { pattern: "sequence d eps" }, { pattern: "sequence" }] },
  { slug: "outil-numerique", label: "Outil numérique", phrases: [{ pattern: "outil numerique" }, { pattern: "application pedagogique" }, { pattern: "logiciel" }] },
  { slug: "formation", label: "Formation", phrases: [{ pattern: "stage de formation" }, { pattern: "parcours de formation" }, { pattern: "offre de formation" }, { pattern: "plan de formation" }] },
  { slug: "document-institutionnel", label: "Document institutionnel", phrases: [{ pattern: "bulletin officiel" }, { pattern: "circulaire" }, { pattern: "lettre de rentree" }, { pattern: "texte officiel" }] },
  { slug: "ressource-pedagogique", label: "Ressource pédagogique", phrases: [{ pattern: "ressource pedagogique" }, { pattern: "scenario pedagogique" }, { pattern: "dossier pedagogique" }] },
];

export type Rubric = {
  slug: string;
  title: string;
  description: string;
  themes: string[];
  levels: string[];
  contentTypes: string[];
};

export const RUBRICS: Rubric[] = [
  { slug: "numerique", title: "Numérique et innovation", description: "Outils, expérimentations et intelligence artificielle.", themes: ["numerique-educatif", "intelligence-artificielle", "innovations-pedagogiques"], levels: [], contentTypes: [] },
  { slug: "ressources", title: "Ressources pédagogiques", description: "Scénarios, séances et dossiers pour la classe.", themes: ["ressources-pedagogiques"], levels: [], contentTypes: ["ressource-pedagogique", "fiche-seance", "sequence"] },
  { slug: "evaluation", title: "Évaluation et examens", description: "CCF, référentiels, examens et certifications.", themes: ["evaluation", "examens-certifications"], levels: [], contentTypes: [] },
  { slug: "college", title: "Enseignement au collège", description: "Cycle 4 et collège.", themes: [], levels: ["college", "cycle-4"], contentTypes: [] },
  { slug: "lycee", title: "Enseignement au lycée", description: "Voie générale et technologique.", themes: [], levels: ["lycee-gt"], contentTypes: [] },
  { slug: "lp", title: "Lycée professionnel", description: "Voie professionnelle et CAP.", themes: [], levels: ["lycee-professionnel", "cap"], contentTypes: [] },
  { slug: "inclusion", title: "Inclusion et EPS adaptée", description: "Accessibilité, inclusion et aptitudes partielles.", themes: ["inclusion", "eps-adaptee"], levels: [], contentTypes: [] },
  { slug: "formation", title: "Formation des enseignants", description: "Stages, webinaires et plans de formation.", themes: ["formation"], levels: [], contentTypes: ["formation", "webinaire"] },
  { slug: "institutionnel", title: "Actualités institutionnelles", description: "Programmes, lettres de rentrée et textes officiels.", themes: ["programmes"], levels: [], contentTypes: ["document-institutionnel"] },
];

export const REGION_LABELS: Record<string, string> = {
  metropole: "Académies métropolitaines",
  outremer: "Outre-mer",
  national: "Sources nationales",
};

export function labelOf(list: Term[], slug: string | null | undefined): string | null {
  if (!slug) return null;
  return list.find((item) => item.slug === slug)?.label ?? null;
}
