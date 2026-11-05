"use client";

import { useState } from "react";

export function ShareButton({ title, path }: { title: string; path: string }) {
  const [message, setMessage] = useState("Partager");

  async function share() {
    const url = new URL(path, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Lien copié");
    } catch {
      setMessage("Copie impossible");
    }
  }

  return (
    <button type="button" className="secondary" onClick={share}>
      {message}
    </button>
  );
}
