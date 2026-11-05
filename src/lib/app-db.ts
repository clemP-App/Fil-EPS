import "server-only";
import { bootstrapRepository } from "@/lib/bootstrap";
import type { Repository } from "@/lib/repository";

let pending: Promise<Repository> | null = null;

export function getRepository(): Promise<Repository> {
  if (!pending) {
    pending = bootstrapRepository().catch((error: unknown) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}
