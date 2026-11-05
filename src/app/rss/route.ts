import { parsePublicFilters } from "@/lib/filters";
import { rssResponse } from "@/lib/rss-response";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const record: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    record[key] = values.length > 1 ? values : values[0];
  }
  return rssResponse(parsePublicFilters(record), `/rss${url.search}`);
}
