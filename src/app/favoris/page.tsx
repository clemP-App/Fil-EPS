import type { Metadata } from "next";
import { FavoritesExplorer } from "@/components/FavoritesExplorer";

export const metadata: Metadata = { title: "Marques-pages", description: "Publications enregistrées dans ce navigateur." };

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-4xl font-extrabold tracking-tight">Marques-pages</h1>
      <p className="mt-2 mb-6 text-muted">Ces articles restent enregistrés dans ce navigateur, sur cet appareil seulement.</p>
      <FavoritesExplorer />
    </div>
  );
}
