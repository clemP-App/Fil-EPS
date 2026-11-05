import { requireAdminLayout } from "@/server/admin-guard";
import { logoutAction } from "@/server/admin-actions";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminLayout();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-[0.14em] text-clay uppercase">Administration</p>
        <nav className="flex flex-wrap gap-4 text-sm" aria-label="Administration">
          <Link href="/admin">Sources</Link>
          <Link href="/admin/publications">Publications</Link>
          <Link href="/admin/syncs">Journaux</Link>
          <form action={logoutAction}><button type="submit" className="secondary">Quitter</button></form>
        </nav>
      </div>
      {children}
    </div>
  );
}
