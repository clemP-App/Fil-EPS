import { VERIFIED_SOURCES } from "@/collector/verified-sources";
import { ACADEMIES } from "@/lib/taxonomy";
import type { SourceDefinition } from "@/lib/types";

export function buildSourceDefinitions(): SourceDefinition[] {
  return ACADEMIES.map((academy) => {
    const verified = VERIFIED_SOURCES.find((source) => source.slug === academy.slug);
    if (!verified) {
      return {
        slug: academy.slug,
        name: academy.label,
        kind: academy.kind,
        regionGroup: academy.regionGroup,
        homepageUrl: null,
        feedUrl: null,
        method: "rss",
        enabled: false,
        config: {},
      };
    }
    return {
      slug: academy.slug,
      name: academy.label,
      kind: academy.kind,
      regionGroup: academy.regionGroup,
      homepageUrl: verified.homepageUrl,
      feedUrl: verified.feedUrl,
      method: verified.method,
      enabled: verified.enabled,
      config: verified.config,
    };
  });
}
