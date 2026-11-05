import { formatDateTime } from "@/lib/dates";
import { statusLabel } from "@/lib/format";
import { getRepository } from "@/lib/app-db";

export const dynamic = "force-dynamic";

export default async function SyncJournalPage() {
  const runs = await (await getRepository()).listSyncRuns(80);
  return (
    <div>
      <h1 className="font-display text-4xl">Journaux de synchronisation</h1>
      <div className="mt-6 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Source</th>
              <th>État</th>
              <th>Nouvelles</th>
              <th>Mises à jour</th>
              <th>Erreurs</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr><td colSpan={7}>Aucune synchronisation enregistrée.</td></tr>
            ) : runs.map((run) => (
              <tr key={run.id}>
                <td>{formatDateTime(run.startedAt)}</td>
                <td>
                  <p>{run.sourceName ?? "Ensemble"}</p>
                  {run.message ? <p className="text-sm text-muted">{run.message}</p> : null}
                  {run.logs.length > 1 ? <pre className="mt-1 whitespace-pre-wrap text-xs text-muted">{run.logs.join("\n")}</pre> : null}
                </td>
                <td>{statusLabel(run.status)}</td>
                <td>{run.newCount}</td>
                <td>{run.updatedCount}</td>
                <td>{run.errorCount}</td>
                <td>{run.durationMs == null ? "—" : `${Math.round(run.durationMs / 1000)} s`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
