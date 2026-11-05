import type { Metadata } from "next";
import { Watchlist } from "@/components/Watchlist";

export const metadata: Metadata = { title: "Ma veille", description: "Publications correspondant aux académies et thèmes suivis sur cet appareil." };

export default function WatchPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl font-extrabold tracking-tight">Ma veille</h1>
      <p className="mt-2 mb-6 max-w-3xl text-muted">Retrouvez en priorité les publications des académies et des thèmes que vous suivez. Le reste du journal reste accessible.</p>
      <Watchlist />
    </div>
  );
}
