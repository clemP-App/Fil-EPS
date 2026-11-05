import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-4xl font-extrabold tracking-tight">Page introuvable</h1>
      <p className="mt-3 text-muted">Cette adresse ne correspond pas à une publication visible.</p>
      <Link href="/" className="button mt-6">Retour au journal</Link>
    </div>
  );
}
