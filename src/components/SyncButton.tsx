"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton({ slug, label = "Synchroniser" }: { slug?: string; label?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function run() {
    setState("running");
    setMessage("");
    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: slug ?? null }),
      });
      const data = (await response.json()) as { error?: string; newCount?: number; updatedCount?: number; errorCount?: number };
      if (!response.ok) {
        setState("error");
        setMessage(data.error || "La synchronisation a échoué.");
        return;
      }
      setState("done");
      setMessage(`${data.newCount ?? 0} nouvelle(s), ${data.updatedCount ?? 0} mise(s) à jour, ${data.errorCount ?? 0} erreur(s).`);
      router.refresh();
    } catch {
      setState("error");
      setMessage("La synchronisation n’a pas abouti.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={run} disabled={state === "running"}>
        {state === "running" ? "Synchronisation…" : label}
      </button>
      {message ? <p className={state === "error" ? "text-sm text-clay" : "text-sm text-muted"}>{message}</p> : null}
    </div>
  );
}
