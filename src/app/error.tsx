"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-4xl font-extrabold tracking-tight">Le journal est momentanément indisponible</h1>
      <p className="mt-3 text-muted">La lecture des publications n’a pas abouti.</p>
      <button type="button" className="button mt-6" onClick={reset}>Réessayer</button>
    </div>
  );
}
