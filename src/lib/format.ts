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
