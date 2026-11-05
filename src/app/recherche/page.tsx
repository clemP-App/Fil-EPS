import type { Metadata } from "next";
import { ResultsView } from "@/components/ResultsView";
import { parsePublicFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recherche", description: "Rechercher et filtrer les publications académiques d'EPS." };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ResultsView filters={parsePublicFilters(await searchParams)} pathname="/recherche" />;
}
