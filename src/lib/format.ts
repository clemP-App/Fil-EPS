export function countLabel(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString("fr-FR")} ${count > 1 ? plural : singular}`;
}

export function sourceKicker(sourceName: string, sourceKind: string): string {
  if (sourceKind === "national") return sourceName;
  return `Académie de ${sourceName}`;
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ok: "En service",
    error: "Erreur",
    pending: "En attente",
    unconfigured: "Non configurée",
    disabled: "Désactivée",
    running: "En cours",
    success: "Réussie",
    partial: "Partielle",
  };
  return labels[status] ?? status;
}

export function methodLabel(method: string): string {
  if (method === "html") return "HTML";
  if (method === "sitemap") return "Sitemap";
  return "RSS / Atom";
}

export function readableSourceError(message: string): string {
  const text = message.trim();
  if (/fetch failed|failed to fetch/i.test(text) || /^Échec réseau\b/i.test(text)) return "Le site n'a pas pu être consulté.";
  if (/aborted due to timeout/i.test(text)) return "Le site a mis trop de temps à répondre.";
  if (/^Certificat expiré\b/.test(text)) return "Le certificat de sécurité du site a expiré.";
  if (/^Le certificat ne correspond pas\b/.test(text)) return "Le certificat de sécurité ne correspond pas à l'adresse du site.";
  if (/^Chaîne de certificat incomplète\b/.test(text)) return "Le certificat de sécurité du site est incomplet.";
  if (/^Hôte injoignable\b/.test(text)) return "Le site ne répond pas.";
  if (/^Délai dépassé\b/.test(text)) return "Le site a mis trop de temps à répondre.";
  if (/^Nom d'hôte introuvable\b/.test(text)) return "L'adresse du site est introuvable.";
  if (/^Connexion interrompue\b/.test(text)) return "La connexion avec le site a été coupée.";
  if (/robots\.txt interdit/i.test(text)) return "Le site interdit la collecte automatique.";
  const http = /^HTTP (\d+)\b/i.exec(text);
  if (http) return httpStatusText(Number(http[1]), hostIn(text));
  return text;
}

function httpStatusText(status: number, host: string | null): string {
  const site = host ? `Le site ${host}` : "Le site";
  if (status === 401 || status === 403) return `${site} refuse l'accès.`;
  if (status === 404) return host ? `La page demandée est introuvable sur ${host}.` : "La page demandée est introuvable.";
  if (status === 408) return `${site} a mis trop de temps à répondre.`;
  if (status === 429) return `${site} demande de patienter avant une nouvelle visite.`;
  if (status >= 500) return `${site} est momentanément indisponible.`;
  return `${site} a renvoyé une erreur.`;
}

function hostIn(text: string): string | null {
  const match = text.match(/https?:\/\/([^/\s]+)/i);
  return match?.[1]?.replace(/:\d+$/, "") ?? null;
}
