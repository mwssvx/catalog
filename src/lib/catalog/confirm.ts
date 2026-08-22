export function shouldConfirmDestructive(action: "delete" | "unpublish" | "sold" | "bulk"): boolean {
  return action === "delete" || action === "unpublish" || action === "sold" || action === "bulk";
}

export function confirmCopy(
  action: "delete" | "unpublish" | "sold" | "bulk",
  count = 1,
): { needsConfirm: true; count: number; action: typeof action } {
  return { needsConfirm: true, count, action };
}
