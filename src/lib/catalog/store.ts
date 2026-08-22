import { getViewer, requireOwner } from "@/lib/auth";
import type { CatalogRepository } from "@/lib/catalog/memory-repository";
import { emptyShop, missingFields, normalizeItem } from "@/lib/catalog/normalize";
import type { BulkItemPatch } from "@/lib/catalog/studio-actions";
import { SupabaseCatalogRepository } from "@/lib/catalog/supabase-repository";
import type {
  BoardSnapshot,
  CatalogData,
  Item,
  ItemFilters,
  ItemInput,
  Shop,
  ShopInput,
  Suggestion,
} from "@/lib/catalog/types";
import { isSupabaseConfigured, publicShopSlug } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { syncPublishedMedia } from "@/lib/media/sync-publication";

export { missingFields, normalizeItem };

let repositoryOverride: CatalogRepository | null = null;
let queue: Promise<unknown> = Promise.resolve();

export function setCatalogRepository(repository: CatalogRepository | null) {
  repositoryOverride = repository;
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function repo(): Promise<CatalogRepository> {
  if (repositoryOverride) return repositoryOverride;
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }
  return new SupabaseCatalogRepository(await createClient());
}

export async function getShop(): Promise<Shop> {
  if (!isSupabaseConfigured() && !repositoryOverride) return emptyShop();
  const shop = await (await repo()).getPublicShop(publicShopSlug());
  return shop ?? emptyShop();
}

export async function getCatalog(): Promise<CatalogData> {
  const viewer = await requireOwner();
  return (await repo()).loadCatalog(viewer);
}

export async function getBoard(): Promise<BoardSnapshot> {
  const data = await getCatalog();
  return data.board;
}

export async function getSuggestions(): Promise<Suggestion[]> {
  const data = await getCatalog();
  return data.suggestions;
}

export async function listItems(filters: ItemFilters = {}): Promise<Item[]> {
  if (!isSupabaseConfigured() && !repositoryOverride) return [];
  const viewer = await getViewer();
  return (await repo()).listItems(viewer, filters);
}

export async function getItem(id: string): Promise<Item | null> {
  if (!isSupabaseConfigured() && !repositoryOverride) return null;
  const viewer = await getViewer();
  return (await repo()).getItem(viewer, id);
}

export async function createItem(input: ItemInput): Promise<Item> {
  const viewer = await requireOwner();
  return enqueue(async () => {
    const item = await (await repo()).createItem(viewer, input);
    await syncPublishedMedia(viewer, [item]);
    return item;
  });
}

export async function updateItem(
  id: string,
  input: ItemInput,
): Promise<Item | null> {
  const viewer = await requireOwner();
  return enqueue(async () => {
    const item = await (await repo()).updateItem(viewer, id, input);
    if (item) await syncPublishedMedia(viewer, [item]);
    return item;
  });
}

export async function deleteItem(id: string): Promise<boolean> {
  const viewer = await requireOwner();
  return enqueue(async () => (await repo()).deleteItem(viewer, id));
}

export async function bulkUpdateItems(
  ids: string[],
  patch: BulkItemPatch,
): Promise<Item[]> {
  const viewer = await requireOwner();
  return enqueue(async () => {
    const items = await (await repo()).bulkUpdateItems(viewer, ids, patch);
    await syncPublishedMedia(viewer, items);
    return items;
  });
}

export async function duplicateItem(id: string): Promise<Item | null> {
  const viewer = await requireOwner();
  return enqueue(async () => {
    const item = await (await repo()).duplicateItem(viewer, id);
    if (item) await syncPublishedMedia(viewer, [item]);
    return item;
  });
}

export async function updateShop(input: ShopInput): Promise<Shop> {
  const viewer = await requireOwner();
  return enqueue(async () => (await repo()).updateShop(viewer, input));
}

export async function saveBoard(
  board: BoardSnapshot,
  expectedVersion: number,
): Promise<BoardSnapshot> {
  const viewer = await requireOwner();
  return enqueue(async () =>
    (await repo()).saveBoard(viewer, board, expectedVersion),
  );
}

export async function listBoardVersions() {
  const viewer = await requireOwner();
  return (await repo()).listBoardVersions(viewer);
}

export async function restoreBoardVersion(versionId: string): Promise<boolean> {
  const viewer = await requireOwner();
  return enqueue(async () =>
    (await repo()).restoreBoardVersion(viewer, versionId),
  );
}

export async function undoLast(): Promise<boolean> {
  const viewer = await requireOwner();
  return enqueue(async () => {
    const ok = await (await repo()).undoLast(viewer);
    if (ok) {
      const data = await (await repo()).loadCatalog(viewer);
      await syncPublishedMedia(viewer, data.items);
    }
    return ok;
  });
}

export async function mutateAsync<T>(
  fn: (data: CatalogData) => Promise<T> | T,
  historyLabel?: string,
): Promise<T> {
  const viewer = await requireOwner();
  return enqueue(async () => {
    const repository = await repo();
    const data = await repository.loadCatalog(viewer);
    const result = await fn(data);
    await repository.saveCatalog(viewer, data, historyLabel);
    await syncPublishedMedia(viewer, data.items);
    return result;
  });
}

export async function availableSizes(): Promise<string[]> {
  const items = await listItems({ status: "all", published: true });
  return [...new Set(items.flatMap((item) => item.sizes))].sort();
}

export async function availableCollections(): Promise<string[]> {
  const items = await listItems({ status: "all", published: true });
  return [...new Set(items.flatMap((item) => item.collections))].sort();
}

export {
  MemoryAiJobs,
  newOrganizeJob,
  type AiJobRepository,
} from "@/lib/ai/jobs";

let aiJobsOverride: import("@/lib/ai/jobs").AiJobRepository | null = null;

export function setAiJobsRepository(
  repository: import("@/lib/ai/jobs").AiJobRepository | null,
) {
  aiJobsOverride = repository;
}

async function aiJobs() {
  if (aiJobsOverride) return aiJobsOverride;
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }
  const { SupabaseAiJobs } = await import("@/lib/ai/supabase-jobs");
  return new SupabaseAiJobs(await createClient());
}

export async function listAiJobs() {
  const viewer = await requireOwner();
  return (await aiJobs()).listJobs(viewer.shopId);
}

export async function getAiJob(id: string) {
  const viewer = await requireOwner();
  return (await aiJobs()).getJob(viewer.shopId, id);
}

export async function saveAiJob(job: import("@/lib/ai/types").AiJob) {
  const viewer = await requireOwner();
  if (job.shopId !== viewer.shopId) {
    throw new Error("Forbidden");
  }
  return (await aiJobs()).saveJob(job);
}
