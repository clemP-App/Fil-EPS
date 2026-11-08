import { ACADEMIES } from "@/lib/taxonomy";

const MARK_COLORS = [
  "#0f766e",
  "#1d4ed8",
  "#b45309",
  "#be123c",
  "#6d28d9",
  "#047857",
  "#0369a1",
  "#c2410c",
  "#7c3aed",
  "#0e7490",
  "#a16207",
  "#9f1239",
  "#4338ca",
  "#3f6212",
  "#155e75",
  "#9a3412",
];

/** Symboles propres au site. Les favicons académiques répètent souvent la Marianne ou le logo WordPress. */
const DISTINCTIVE_LOGOS: Record<string, string> = {
  lille: "https://pedagogie.ac-lille.fr/eps/wp-content/uploads/sites/26/2022/03/cropped-MiniLogo-180x180.png",
  polynesie: "https://eps.education.pf/wp-content/uploads/2019/04/cropped-EPS1-favicon-180x180.jpg",
  "nouvelle-caledonie": "https://eps.ac-noumea.nc/plugins/auto/squeletteDSFR/favicon/apple-touch-icon.png",
  aeeps: "https://www.aeeps.org/apple-icon-180x180.png?v1.6",
  "snep-fsu": "https://lesite.snepfsu.fr/wp-content/uploads/2020/12/cropped-etoile-180x180.jpg",
  "tube-eps": "https://tube-education-physique-et-sportive.apps.education.fr/client/assets/images/icons/icon-192x192.png",
};

const SKIPPED = new Set(["la", "le", "les", "de", "du", "des"]);

export function sourceInitials(name: string): string {
  const parts = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter((part, index) => part && (index === 0 || !SKIPPED.has(part.toLowerCase())));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function sourceMarkColor(slug: string): string {
  const index = ACADEMIES.findIndex((item) => item.slug === slug);
  const slot = index >= 0 ? index : [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return MARK_COLORS[slot % MARK_COLORS.length];
}

export function sourceLogoUrl(slug: string): string | null {
  return DISTINCTIVE_LOGOS[slug] ?? null;
}
