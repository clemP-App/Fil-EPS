export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true" aria-live="polite">
      <p className="text-muted">Chargement du journal…</p>
      <div className="surface mt-6 h-64" />
    </div>
  );
}
