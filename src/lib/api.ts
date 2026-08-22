import type { Item, ItemInput } from "@/lib/catalog/types";

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(path, {
      credentials: "include",
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error || "Request failed");
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function itemPayload(input: ItemInput): string {
  return JSON.stringify(input);
}

export type UploadResponse = { url: string };
export type ItemResponse = { item: Item };
export type ItemsResponse = { items: Item[] };
