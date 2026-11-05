import { APSAS, CONTENT_RULES, CONTENT_TYPES, LEVELS, THEMES, type TermRule } from "@/lib/taxonomy";
import { fold, tagSlug } from "@/lib/text";

export type Classification = {
  themes: string[];
  apsas: string[];
  levels: string[];
  contentType: string | null;
  tags: string[];
};

export type ClassifyInput = {
  title: string;
  summary?: string | null;
  categories?: string[];
  section?: string | null;
  url?: string | null;
  fromFeed?: boolean;
};

type Hit = { slug: string; tag: string; start: number; end: number };

export function classify(input: ClassifyInput): Classification {
  const text = fold([input.title, input.summary, input.section, ...(input.categories ?? [])].filter(Boolean).join("\n"));
  const themes = matchRules(text, THEMES).slugs.filter((slug) => slug !== "autres");
  const apsaMatch = matchRules(text, APSAS);
  const levelMatch = matchRules(text, LEVELS);
  const contentType = detectContentType(text, input.url, input.fromFeed === true);
  const tags = unique([
    ...apsaMatch.tags,
    ...cleanNativeTags(input.categories ?? []),
  ]).slice(0, 12);
  return {
    themes,
    apsas: apsaMatch.slugs,
    levels: levelMatch.slugs,
    contentType,
    tags,
  };
}

export function matchRules(text: string, rules: TermRule[]): { slugs: string[]; tags: string[] } {
  const hits: Hit[] = [];
  for (const rule of rules) {
    for (const phrase of rule.phrases) {
      const pattern = fold(phrase.pattern);
      if (!pattern) continue;
      let from = 0;
      while (from < text.length) {
        const index = text.indexOf(pattern, from);
        if (index < 0) break;
        const end = index + pattern.length;
        if (hasBoundary(text, index, end)) {
          hits.push({ slug: rule.slug, tag: phrase.tag ?? rule.label, start: index, end });
        }
        from = index + Math.max(pattern.length, 1);
      }
    }
  }
  hits.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const kept: Hit[] = [];
  for (const hit of hits) {
    if (kept.some((item) => hit.start < item.end && hit.end > item.start)) continue;
    kept.push(hit);
  }
  return {
    slugs: unique(kept.map((hit) => hit.slug)),
    tags: unique(kept.map((hit) => hit.tag)),
  };
}

function hasBoundary(text: string, start: number, end: number): boolean {
  const before = text[start - 1] ?? " ";
  const after = text[end] ?? " ";
  if (/[a-z0-9]/i.test(before)) return false;
  if (!/[a-z0-9]/i.test(after)) return true;
  return after.toLowerCase() === "s" && !/[a-z0-9]/i.test(text[end + 1] ?? " ");
}

function detectContentType(text: string, url: string | null | undefined, fromFeed: boolean): string | null {
  if (url && /\.pdf($|\?)/i.test(url)) return "pdf";
  if (url && /youtube\.com|youtu\.be|peertube|tube-education/i.test(url)) return "video";
  const slugs = matchRules(text, CONTENT_RULES).slugs;
  const matched = CONTENT_RULES.find((rule) => slugs.includes(rule.slug))?.slug;
  if (matched && CONTENT_TYPES.some((type) => type.slug === matched)) return matched;
  if (fromFeed) return "article";
  return null;
}

function cleanNativeTags(categories: string[]): string[] {
  const tags: string[] = [];
  for (const category of categories) {
    const label = category.replace(/\s+/g, " ").trim();
    if (label.length < 2 || label.length > 40) continue;
    if (/^https?:/i.test(label)) continue;
    if (!tagSlug(label)) continue;
    tags.push(label);
  }
  return tags;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
