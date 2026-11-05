"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Story } from "@/components/Story";
import { readFavorites } from "@/components/FavoriteButton";
import type { Publication } from "@/lib/types";

export function FavoritesExplorer() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [items, setItems] = useState<Publication[]>([]);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setIds(readFavorites());
    sync();
    window.addEventListener("veille-favorites-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("veille-favorites-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!ids) return;
    if (ids.length === 0) {
      setItems([]);
      setReady(true);
      return;
    }
    setReady(false);
    const controller = new AbortController();
    fetch(`/api/publications?ids=${ids.map(encodeURIComponent).join(",")}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("lecture impossible");
        return response.json() as Promise<{ items: Publication[] }>;
      })
      .then((data) => {
        setFailed(false);
        setItems(data.items);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setFailed(true);
        setReady(true);
      });
    return () => controller.abort();
  }, [ids]);

  if (failed) return <p>Les marques-pages n’ont pas pu être affichés. Rechargez la page.</p>;
  if (!ids || !ready) return <p className="text-muted">Lecture des marques-pages de ce navigateur…</p>;
  if (ids.length === 0) {
    return (
      <p>
        Aucun marque-page pour le moment. Sur un article, utilisez l’icône pour l’ajouter à vos marques-pages.{" "}
        <Link href="/" className="font-semibold text-pine no-underline hover:underline">Retour au journal</Link>
      </p>
    );
  }
  return (
    <div>
      {items.length < ids.length ? <p className="mb-4 text-sm text-muted">Certaines publications enregistrées ne sont plus au catalogue.</p> : null}
      {items.map((publication) => <Story key={publication.id} publication={publication} />)}
    </div>
  );
}
