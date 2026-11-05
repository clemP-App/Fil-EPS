"use client";

import { useEffect, useState } from "react";

const KEY = "veille-eps-favorites";

export function readFavorites(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writeFavorites(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("veille-favorites-changed"));
}

export function FavoriteButton({ id }: { id: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(readFavorites().includes(id));
    sync();
    window.addEventListener("veille-favorites-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("veille-favorites-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);

  function toggle() {
    const current = readFavorites();
    writeFavorites(active ? current.filter((item) => item !== id) : [...current, id]);
  }

  const label = active ? "Retirer de mes marques-pages" : "Ajouter à mes marques-pages";

  return (
    <button type="button" className="icon-button" aria-pressed={active} aria-label={label} title={label} onClick={toggle}>
      <BookmarkIcon filled={active} />
    </button>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 3.75h10A1.25 1.25 0 0 1 18.25 5v15.1L12 16.4l-6.25 3.7V5A1.25 1.25 0 0 1 7 3.75Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
