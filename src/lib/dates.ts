import { fold } from "@/lib/text";

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
};

type ParisParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function parisParts(date: Date): ParisParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  let hour = read("hour");
  if (hour === 24) hour = 0;
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour,
    minute: read("minute"),
    second: read("second"),
  };
}

/** Minuit à Paris pour le jour civil de l'instant donné. */
export function parisStartOfDay(date: Date): Date {
  const { year, month, day } = parisParts(date);
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const observed = parisParts(guess);
  const observedUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
  const targetUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  return new Date(guess.getTime() - (observedUtc - targetUtc));
}

export function parseLooseDate(value: string | null | undefined, now = Date.now()): string | null {
  if (!value) return null;
  const french = value.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (french) {
    const day = Number(french[1]);
    const month = Number(french[2]);
    const year = Number(french[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return parseFeedDate(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString(), now);
  }
  const named = fold(value).match(
    /\b(\d{1,2}) (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre) (\d{4})\b/,
  );
  if (named) {
    const day = Number(named[1]);
    const month = FRENCH_MONTHS[named[2]];
    const year = Number(named[3]);
    if (!month || day < 1 || day > 31) return null;
    return parseFeedDate(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString(), now);
  }
  return parseFeedDate(value, now);
}

export function parseFeedDate(value: string | null | undefined, now = Date.now()): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 1995 || date.getTime() > now + 2 * 24 * 60 * 60 * 1000) return null;
  return date.toISOString();
}

export type PeriodKey = "" | "aujourdhui" | "7j" | "30j" | "90j" | "annee" | "personnalisee";

export function periodBounds(
  period: PeriodKey,
  from: string,
  to: string,
  now = new Date(),
): { from: string | null; to: string | null } {
  if (period === "aujourdhui") {
    const start = parisStartOfDay(now);
    return { from: start.toISOString(), to: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString() };
  }
  const days: Record<string, number> = { "7j": 7, "30j": 30, "90j": 90 };
  if (days[period]) {
    return { from: new Date(now.getTime() - days[period] * 24 * 60 * 60 * 1000).toISOString(), to: null };
  }
  if (period === "annee") {
    const year = parisParts(now).year;
    const noon = new Date(Date.UTC(year, 0, 1, 12, 0, 0));
    return { from: parisStartOfDay(noon).toISOString(), to: null };
  }
  if (period === "personnalisee") {
    const start = dayInputToIso(from);
    const endDay = dayInputToIso(to);
    return {
      from: start,
      to: endDay ? new Date(new Date(endDay).getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
    };
  }
  return { from: null, to: null };
}

function dayInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(probe.getTime())) return null;
  return parisStartOfDay(probe).toISOString();
}

export function formatEditionDate(date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "Date inconnue";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Date inconnue";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
