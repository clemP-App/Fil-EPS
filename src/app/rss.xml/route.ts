import { rssResponse } from "@/lib/rss-response";
import { EMPTY_FILTERS } from "@/lib/filters";

export const dynamic = "force-dynamic";

export function GET() {
  return rssResponse(EMPTY_FILTERS, "/rss.xml");
}
