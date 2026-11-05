import { JournalHome } from "@/components/JournalHome";
import { ResultsView } from "@/components/ResultsView";
import { filtersActive, parsePublicFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parsePublicFilters(await searchParams);
  if (filtersActive(filters)) return <ResultsView filters={filters} pathname="/" />;
  return <JournalHome />;
}
