import { parsePublicFilters, toQueryParts } from "@/lib/filters";
import { getRepository } from "@/lib/app-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const repo = await getRepository();
  const ids = url.searchParams.get("ids");
  if (ids) {
    const list = ids
      .split(",")
      .map((item) => item.trim())
      .filter((item) => /^[0-9a-f-]{16,80}$/i.test(item))
      .slice(0, 100);
    const items = await repo.getMany(list);
    return Response.json({ items, total: items.length, page: 1, pageSize: items.length });
  }
  const record: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    record[key] = values.length > 1 ? values : values[0];
  }
  const filters = parsePublicFilters(record);
  const parts = toQueryParts(filters);
  const result = await repo.listPublications(parts);
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}
