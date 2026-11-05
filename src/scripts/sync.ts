import { bootstrapRepository } from "@/lib/bootstrap";
import { runSync } from "@/collector/sync";

if (process.env.CI && !process.env.DATABASE_URL) {
  console.error("DATABASE_URL est requis pour la synchronisation en intégration continue.");
  process.exit(1);
}

async function main() {
  const slug = process.argv[2] ?? null;
  const repo = await bootstrapRepository();
  const summary = await runSync(repo, { slug });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.sources === 0) {
    console.error("Aucune source activée. Vérifiez src/collector/verified-sources.ts.");
    return;
  }
  if (summary.errorCount > 0 && summary.newCount === 0 && summary.updatedCount === 0 && summary.unchangedCount === 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
