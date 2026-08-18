"use client";

import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import type { BoardElement, BoardSnapshot, Item } from "@/lib/catalog/types";
import { formatPrice } from "@/lib/catalog/format";

type Camera = { x: number; y: number; zoom: number };

type BoardCanvasProps = {
  board: BoardSnapshot;
  items: Item[];
  selectedIds: string[];
  highlightedIds: string[];
  currencySymbol: string;
  onSelect: (ids: string[], additive?: boolean) => void;
  onChangeElements: (elements: BoardElement[]) => void;
  onCamera: (camera: Camera) => void;
  onDropFiles: (files: FileList, worldX: number, worldY: number) => void;
  labels: {
    unpublished: string;
    sold: string;
    noPhoto: string;
    ask: string;
  };
};

export function BoardCanvas({
  board,
  items,
  selectedIds,
  highlightedIds,
  currencySymbol,
  onSelect,
  onChangeElements,
  onCamera,
  onDropFiles,
  labels,
}: BoardCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const getBoard = useEffectEvent(() => board);
  const emitElements = useEffectEvent(onChangeElements);
  const emitCamera = useEffectEvent(onCamera);
  const emitSelect = useEffectEvent(onSelect);

  const dragRef = useRef<{
    mode: "pan" | "move" | "resize";
    id?: string;
    startX: number;
    startY: number;
    origW?: number;
    origH?: number;
    origCamera: Camera;
    originals: Array<{ id: string; x: number; y: number }>;
    moved: boolean;
  } | null>(null);

  const products = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  function clientToWorld(clientX: number, clientY: number, camera: Camera) {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - camera.x) / camera.zoom,
      y: (clientY - rect.top - camera.y) / camera.zoom,
    };
  }

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const surface = rootRef.current;
      if (!surface) return;
      const camera = getBoard().camera;
      if (event.ctrlKey || event.metaKey) {
        const world = clientToWorld(event.clientX, event.clientY, camera);
        const nextZoom = Math.min(
          2.4,
          Math.max(0.28, camera.zoom * (event.deltaY > 0 ? 0.92 : 1.08)),
        );
        const rect = surface.getBoundingClientRect();
        emitCamera({
          zoom: nextZoom,
          x: event.clientX - rect.left - world.x * nextZoom,
          y: event.clientY - rect.top - world.y * nextZoom,
        });
        return;
      }
      emitCamera({
        ...camera,
        x: camera.x - event.deltaX,
        y: camera.y - event.deltaY,
      });
    }

    function applyDrag(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (drag.mode === "pan") {
        emitCamera({
          ...drag.origCamera,
          x: drag.origCamera.x + dx,
          y: drag.origCamera.y + dy,
        });
        return;
      }
      const snapshot = getBoard();
      if (drag.mode === "move") {
        const zoom = snapshot.camera.zoom;
        const byId = new Map(drag.originals.map((entry) => [entry.id, entry]));
        emitElements(
          snapshot.elements.map((element) => {
            const original = byId.get(element.id);
            if (!original) return element;
            return {
              ...element,
              x: original.x + dx / zoom,
              y: original.y + dy / zoom,
            };
          }),
        );
      }
      if (drag.mode === "resize" && drag.id) {
        const zoom = snapshot.camera.zoom;
        emitElements(
          snapshot.elements.map((element) =>
            element.id === drag.id
              ? {
                  ...element,
                  width: Math.max(120, (drag.origW ?? element.width) + dx / zoom),
                  height: Math.max(90, (drag.origH ?? element.height) + dy / zoom),
                }
              : element,
          ),
        );
      }
    }

    function endDrag(event: PointerEvent) {
      const drag = dragRef.current;
      if (drag?.mode === "pan" && !drag.moved) emitSelect([]);
      dragRef.current = null;
      if (rootRef.current?.hasPointerCapture(event.pointerId)) {
        rootRef.current.releasePointerCapture(event.pointerId);
      }
    }

    node.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", applyDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      node.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", applyDrag);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  function beginPan(event: React.PointerEvent) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    rootRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "pan",
      startX: event.clientX,
      startY: event.clientY,
      origCamera: board.camera,
      originals: [],
      moved: false,
    };
  }

  function beginMove(event: React.PointerEvent, element: BoardElement) {
    event.preventDefault();
    event.stopPropagation();
    rootRef.current?.setPointerCapture(event.pointerId);
    if (!selectedIds.includes(element.id)) {
      onSelect(event.shiftKey ? [...selectedIds, element.id] : [element.id]);
    }
    const movingIds = selectedIds.includes(element.id) ? selectedIds : [element.id];
    dragRef.current = {
      mode: "move",
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      origCamera: board.camera,
      originals: board.elements
        .filter((entry) => movingIds.includes(entry.id))
        .map((entry) => ({ id: entry.id, x: entry.x, y: entry.y })),
      moved: false,
    };
  }

  function startResize(event: React.PointerEvent, element: BoardElement) {
    event.preventDefault();
    event.stopPropagation();
    rootRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "resize",
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      origW: element.width,
      origH: element.height,
      origCamera: board.camera,
      originals: [],
      moved: false,
    };
  }

  return (
    <div
      ref={rootRef}
      className="relative z-0 h-full overflow-hidden rounded-[24px] bg-[#e8edf4] select-none"
      style={{ touchAction: "none" }}
      onPointerDown={beginPan}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const world = clientToWorld(event.clientX, event.clientY, board.camera);
        if (event.dataTransfer.files.length) {
          onDropFiles(event.dataTransfer.files, world.x, world.y);
        }
      }}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${board.camera.x}px, ${board.camera.y}px) scale(${board.camera.zoom})`,
        }}
      >
        <div
          className="absolute -left-[4000px] -top-[4000px] h-[8000px] w-[8000px] opacity-70"
          style={{
            backgroundImage: "radial-gradient(#cfd6e2 1.2px, transparent 1.2px)",
            backgroundSize: "28px 28px",
          }}
        />
        {board.elements
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((element) => {
            const selected = selectedIds.includes(element.id);
            const highlighted = highlightedIds.includes(element.id);
            const product = element.productId ? products[element.productId] : null;
            return (
              <div
                key={element.id}
                className={`pointer-events-auto absolute cursor-grab ${
                  element.type === "section"
                    ? "rounded-[28px] border border-dashed border-olive/40"
                    : "rounded-[22px] bg-white shadow-sm"
                } ${selected ? "ring-2 ring-olive" : ""} ${
                  highlighted ? "ring-2 ring-amber-400" : ""
                }`}
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                  background:
                    element.type === "section" ? element.color || "#e7eefc" : undefined,
                  zIndex: element.zIndex,
                }}
                onPointerDown={(event) => beginMove(event, element)}
              >
                {element.type === "section" ? (
                  <p className="px-4 py-3 text-sm font-semibold">{element.title}</p>
                ) : null}
                {element.type === "media" && element.mediaUrl ? (
                  element.mediaKind === "video" ? (
                    <video
                      src={element.mediaUrl}
                      className="pointer-events-none h-full w-full rounded-[22px] object-cover"
                      muted
                      playsInline
                      draggable={false}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={element.mediaUrl}
                      alt=""
                      draggable={false}
                      className="pointer-events-none h-full w-full rounded-[22px] object-cover [-webkit-user-drag:none]"
                    />
                  )
                ) : null}
                {element.type === "product" && product ? (
                  <div className="pointer-events-none flex h-full flex-col p-2">
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] bg-paper">
                      {product.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.photos[0]}
                          alt={product.title}
                          draggable={false}
                          className="h-full w-full object-cover [-webkit-user-drag:none]"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-muted">
                          {labels.noPhoto}
                        </div>
                      )}
                    </div>
                    <div className="pt-2">
                      <p className="text-[11px] font-semibold text-olive">{product.code}</p>
                      <p className="truncate text-sm font-semibold">{product.title}</p>
                      <p className="text-xs text-muted">
                        {formatPrice(product.price, currencySymbol, labels.ask)}
                      </p>
                      <p className="text-[11px] text-muted">
                        {product.published ? "" : labels.unpublished}
                        {product.status === "sold" ? ` ${labels.sold}` : ""}
                      </p>
                    </div>
                  </div>
                ) : null}
                {element.type === "note" ? (
                  <p className="pointer-events-none p-3 text-sm whitespace-pre-wrap">
                    {element.text}
                  </p>
                ) : null}
                {element.type === "label" ? (
                  <p className="pointer-events-none grid h-full place-items-center text-sm font-medium">
                    {element.title}
                  </p>
                ) : null}
                {selected ? (
                  <button
                    type="button"
                    className="absolute -bottom-1.5 -right-1.5 size-4 cursor-nwse-resize rounded-sm bg-olive"
                    onPointerDown={(event) => startResize(event, element)}
                  />
                ) : null}
              </div>
            );
          })}
      </div>
    </div>
  );
}
