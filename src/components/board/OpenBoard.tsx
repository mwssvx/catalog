"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { cascadePoint, nextZIndex } from "@/lib/board/layout";
import type { BoardSnapshot, Item, Suggestion } from "@/lib/catalog/types";

type Workspace = {
  items: Item[];
  board: BoardSnapshot;
  suggestions: Suggestion[];
};

export function OpenBoard() {
  const t = useTranslations("board");
  const locale = useLocale();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [view, setView] = useState<"board" | "table">("board");
  const [aiOpen, setAiOpen] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [currency, setCurrency] = useState("сом");
  const [status, setStatus] = useState("");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      const [boardRes, aiRes] = await Promise.all([
        fetch("/api/v1/board"),
        fetch("/api/v1/ai/act"),
      ]);
      const boardJson = (await boardRes.json()) as Workspace & {
        shop?: { currencySymbol: string };
      };
      const aiJson = (await aiRes.json()) as { configured?: boolean };
      setWorkspace({
        items: boardJson.items,
        board: boardJson.board,
        suggestions: boardJson.suggestions ?? [],
      });
      setCurrency(boardJson.shop?.currencySymbol || "сом");
      setConfigured(Boolean(aiJson.configured));
    })();
  }, []);

  function queueSave(board: BoardSnapshot) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void fetch("/api/v1/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board }),
      });
    }, 400);
  }

  function updateBoard(patch: Partial<BoardSnapshot>) {
    setWorkspace((current) => {
      if (!current) return current;
      const board = { ...current.board, ...patch };
      queueSave(board);
      return { ...current, board };
    });
  }

  function applyServer(payload: Partial<Workspace>) {
    setWorkspace((current) =>
      current
        ? {
            items: payload.items ?? current.items,
            board: payload.board ?? current.board,
            suggestions: payload.suggestions ?? current.suggestions,
          }
        : current,
    );
  }

  async function command(body: Record<string, unknown>) {
    setBusy(true);
    const response = await fetch("/api/v1/board/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as Workspace & { summary?: string };
    applyServer(payload);
    if (payload.summary) setStatus(payload.summary);
    setBusy(false);
  }

  async function makeCards() {
    if (!workspace) return;
    const ids =
      selectedIds.length > 0
        ? selectedIds
        : workspace.board.elements
            .filter((element) => element.type === "media")
            .map((element) => element.id);
    if (!ids.length) {
      setStatus(t("selectPhotos"));
      return;
    }
    await command({ command: "cards", elementIds: ids });
  }

  async function publishSelected() {
    const ids =
      workspace?.board.elements
        .filter((element) => selectedIds.includes(element.id) && element.productId)
        .map((element) => element.productId!) ?? [];
    if (!ids.length) {
      setStatus(t("selectCards"));
      return;
    }
    await command({
      command: "publish",
      productIds: ids,
      published: true,
    });
  }

  async function onDropFiles(files: FileList, worldX: number, worldY: number) {
    if (!workspace) return;
    const data = new FormData();
    for (const file of Array.from(files)) data.append("files", file);
    const response = await fetch("/api/v1/uploads", { method: "POST", body: data });
    const payload = (await response.json()) as {
      files?: Array<{ url: string; kind: "image" | "video" }>;
    };
    if (!payload.files?.length) return;
    const elements = [...workspace.board.elements];
    payload.files.forEach((file, index) => {
      const point = cascadePoint(index, worldX, worldY);
      elements.push({
        id: crypto.randomUUID(),
        type: "media",
        x: point.x,
        y: point.y,
        width: 170,
        height: 170,
        zIndex: nextZIndex(elements),
        mediaUrl: file.url,
        mediaKind: file.kind,
      });
    });
    updateBoard({ elements });
  }

  async function addNote() {
    if (!workspace) return;
    const elements = [...workspace.board.elements];
    elements.push({
      id: crypto.randomUUID(),
      type: "note",
      x: 120 - workspace.board.camera.x,
      y: 120 - workspace.board.camera.y,
      width: 220,
      height: 140,
      zIndex: nextZIndex(elements),
      text: t("newNote"),
    });
    updateBoard({ elements });
  }

  async function undo() {
    const response = await fetch("/api/v1/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "undo" }),
    });
    const payload = (await response.json()) as Workspace & { ok?: boolean };
    if (payload.ok) applyServer(payload);
  }

  async function sendAi(confirmDelete = false) {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setChat((current) => [...current, { role: "user", text }]);
    setMessage("");
    const response = await fetch("/api/v1/ai/act", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        selectedElementIds: selectedIds,
        locale,
        confirmDelete,
      }),
    });
    const payload = (await response.json()) as Workspace & {
      reply?: string;
      highlighted?: string[];
      needsConfirm?: boolean;
      configured?: boolean;
    };
    setConfigured(payload.configured ?? configured);
    if (payload.needsConfirm) {
      setChat((current) => [
        ...current,
        { role: "ai", text: payload.reply || t("confirmDelete") },
      ]);
      setBusy(false);
      return;
    }
    applyServer(payload);
    setHighlightedIds(payload.highlighted ?? []);
    setChat((current) => [
      ...current,
      { role: "ai", text: payload.reply || t("done") },
    ]);
    setBusy(false);
  }

  if (!workspace) {
    return <p className="p-8 text-muted">{t("loading")}</p>;
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[28rem] flex-col gap-3 lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div
          className="relative z-30 flex flex-wrap items-center gap-2 rounded-[20px] bg-white p-2 shadow-sm"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <label className="cursor-pointer rounded-[14px] bg-ink px-3 py-2 text-sm font-medium text-white">
            {t("upload")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              multiple
              className="sr-only"
              onChange={(event) => {
                if (event.target.files) void onDropFiles(event.target.files, 80, 80);
                event.target.value = "";
              }}
            />
          </label>
          <button type="button" className="chip cursor-pointer" onClick={() => void addNote()}>
            {t("note")}
          </button>
          <button
            type="button"
            className="chip cursor-pointer"
            onClick={() =>
              void command({ command: "section", title: t("section"), elementIds: selectedIds })
            }
          >
            {t("section")}
          </button>
          <button
            type="button"
            className="chip cursor-pointer"
            onClick={() => void makeCards()}
          >
            {t("makeCards")}
          </button>
          <button
            type="button"
            className="chip cursor-pointer"
            onClick={() => void publishSelected()}
          >
            {t("publish")}
          </button>
          <button type="button" className="chip cursor-pointer" onClick={() => void undo()}>
            {t("undo")}
          </button>
          <button
            type="button"
            className="chip cursor-pointer"
            onClick={() => setView(view === "board" ? "table" : "board")}
          >
            {view === "board" ? t("tableView") : t("boardView")}
          </button>
          <Link href="/studio" className="chip cursor-pointer">
            {t("list")}
          </Link>
          <button
            type="button"
            className="ml-auto chip cursor-pointer lg:hidden"
            onClick={() => setAiOpen((value) => !value)}
          >
            AI
          </button>
        </div>
        <p className="relative z-30 px-1 text-xs text-muted">
          {status || t("moveHint")}
        </p>

        {view === "board" ? (
          <div className="relative z-0 min-h-0 flex-1 overflow-hidden">
            <BoardCanvas
              board={workspace.board}
              items={workspace.items}
              selectedIds={selectedIds}
              highlightedIds={highlightedIds}
              currencySymbol={currency}
              onSelect={(ids, additive) =>
                setSelectedIds((current) =>
                  additive ? [...new Set([...current, ...ids])] : ids,
                )
              }
              onChangeElements={(elements) => updateBoard({ elements })}
              onCamera={(camera) => updateBoard({ camera })}
              onDropFiles={onDropFiles}
              labels={{
                unpublished: t("unpublished"),
                sold: t("sold"),
                noPhoto: t("noPhoto"),
                ask: t("ask"),
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[24px] bg-white p-3 shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="p-2">{t("code")}</th>
                  <th className="p-2">{t("product")}</th>
                  <th className="p-2">{t("colors")}</th>
                  <th className="p-2">{t("price")}</th>
                  <th className="p-2">{t("sizes")}</th>
                  <th className="p-2">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {workspace.items.map((item) => (
                  <tr key={item.id} className="border-t border-rule">
                    <td className="p-2 font-semibold text-olive">{item.code}</td>
                    <td className="p-2">{item.title}</td>
                    <td className="p-2">
                      {item.variants.map((variant) => variant.color || "—").join(" / ")}
                    </td>
                    <td className="p-2">
                      {item.price == null ? "—" : `${item.price} ${currency}`}
                    </td>
                    <td className="p-2">{item.sizes.join(", ") || "—"}</td>
                    <td className="p-2">
                      {item.published ? t("published") : t("unpublished")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside
        className={`${
          aiOpen ? "flex" : "hidden lg:flex"
        } w-full flex-col rounded-[24px] bg-white p-3 shadow-sm lg:w-[340px]`}
      >
        <p className="text-sm font-semibold">{t("aiTitle")}</p>
        <p className="mt-1 text-xs text-muted">
          {configured === false ? t("aiOff") : t("aiHelp")}
        </p>
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {chat.map((entry, index) => (
            <div
              key={`${entry.role}-${index}`}
              className={`rounded-[16px] px-3 py-2 text-sm ${
                entry.role === "user" ? "bg-ink text-white" : "bg-paper"
              }`}
            >
              {entry.text}
            </div>
          ))}
          {workspace.suggestions.slice(-4).map((suggestion) => (
            <div key={suggestion.id} className="rounded-[16px] bg-amber-50 px-3 py-2 text-xs">
              {suggestion.text}
            </div>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void sendAi();
          }}
        >
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("aiPlaceholder")}
            className="field flex-1"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-[14px] bg-olive px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "…" : t("send")}
          </button>
        </form>
      </aside>
    </div>
  );
}

