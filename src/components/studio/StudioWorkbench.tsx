import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CoverPhoto } from "@/components/CoverPhoto";
import { ConfirmDialog } from "@/components/studio/ConfirmDialog";
import { Link, useRouter } from "@/i18n/navigation";
import { missingFields } from "@/lib/catalog/normalize";
import {
  filterStudioItems,
  type BulkItemPatch,
  type StudioListFilters,
  type StudioPublicationFilter,
  type StudioSort,
} from "@/lib/catalog/studio-actions";
import type { Item } from "@/lib/catalog/types";

export function StudioWorkbench({
  initialItems,
  currencySymbol,
}: {
  initialItems: Item[];
  currencySymbol: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState<StudioListFilters>({
    publication: "all",
    missing: false,
    status: "all",
    q: "",
    sort: "updated",
  });
  const [priceMode, setPriceMode] = useState<"percent" | "delta">("percent");
  const [priceValue, setPriceValue] = useState("");
  const [confirm, setConfirm] = useState<null | {
    title: string;
    body: string;
    run: () => Promise<void>;
  }>(null);
  const [pending, setPending] = useState(false);

  const visible = useMemo(
    () => filterStudioItems(items, filters),
    [items, filters],
  );

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/items?status=all&published=all");
      const payload = (await response.json()) as { items?: Item[]; error?: string };
      if (!response.ok) throw new Error(payload.error || t("studio.loadError"));
      setItems(payload.items ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("studio.loadError"));
    } finally {
      setLoading(false);
    }
  }

  async function runBulk(patch: BulkItemPatch) {
    setPending(true);
    const response = await fetch("/api/v1/items/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected, ...patch }),
    });
    const payload = (await response.json()) as { items?: Item[]; error?: string };
    setPending(false);
    setConfirm(null);
    if (!response.ok) {
      setError(payload.error || t("studio.bulkError"));
      return;
    }
    const next = new Map((payload.items ?? []).map((item) => [item.id, item]));
    setItems((current) => current.map((item) => next.get(item.id) ?? item));
    setSelected([]);
    setPriceValue("");
  }

  function askBulk(patch: BulkItemPatch, body: string) {
    if (!selected.length) return;
    setConfirm({
      title: t("studio.confirmTitle"),
      body,
      run: () => runBulk(patch),
    });
  }

  function askBulkPrice() {
    if (!selected.length) return;
    const value = Number(priceValue);
    if (!Number.isFinite(value)) {
      setError(t("studio.priceInvalid"));
      return;
    }
    const patch: BulkItemPatch =
      priceMode === "percent"
        ? { pricePercent: value }
        : { priceDelta: value };
    askBulk(
      patch,
      priceMode === "percent"
        ? t("studio.confirmPricePercent", { value, count: selected.length })
        : t("studio.confirmPriceDelta", {
            value,
            symbol: currencySymbol,
            count: selected.length,
          }),
    );
  }

  async function duplicateOne(id: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/items/${id}/duplicate`, {
        method: "POST",
      });
      const payload = (await response.json()) as { item?: Item; error?: string };
      if (!response.ok || !payload.item) {
        throw new Error(payload.error || t("studio.duplicateError"));
      }
      setItems((current) => [payload.item!, ...current]);
      router.push(`/studio/items/${payload.item.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("studio.duplicateError"),
      );
    } finally {
      setPending(false);
    }
  }

  const chips: Array<{
    key: StudioPublicationFilter | "missing";
    label: string;
    active: boolean;
    on: () => void;
  }> = [
    {
      key: "all",
      label: t("studio.filterAll"),
      active: filters.publication === "all" && !filters.missing,
      on: () =>
        setFilters((current) => ({
          ...current,
          publication: "all",
          missing: false,
        })),
    },
    {
      key: "draft",
      label: t("studio.filterDrafts"),
      active: filters.publication === "draft",
      on: () =>
        setFilters((current) => ({
          ...current,
          publication: "draft",
          missing: false,
        })),
    },
    {
      key: "published",
      label: t("studio.filterPublished"),
      active: filters.publication === "published",
      on: () =>
        setFilters((current) => ({
          ...current,
          publication: "published",
          missing: false,
        })),
    },
    {
      key: "missing",
      label: t("studio.filterMissing"),
      active: filters.missing,
      on: () =>
        setFilters((current) => ({
          ...current,
          missing: true,
          publication: "all",
        })),
    },
  ];

  const sorts: Array<{ key: StudioSort; label: string }> = [
    { key: "updated", label: t("studio.sortUpdated") },
    { key: "price_asc", label: t("studio.sortPriceAsc") },
    { key: "price_desc", label: t("studio.sortPriceDesc") },
    { key: "code", label: t("studio.sortCode") },
    { key: "no_photo", label: t("studio.sortNoPhoto") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-paper-2 px-4 py-4 shadow-sm">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("studio.listTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t("studio.counts", {
              inStock: items.filter((item) => item.status === "in_stock").length,
              total: items.length,
            })}
          </p>
        </div>
        <Link href="/studio/new" className="btn btn-primary min-h-11 px-5">
          {t("header.addItem")}
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.on}
            className={`chip min-h-10 shrink-0 ${chip.active ? "is-active" : ""}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "in_stock", "reserved", "sold"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              setFilters((current) => ({ ...current, status: value }))
            }
            className={`chip min-h-10 shrink-0 ${filters.status === value ? "is-active" : ""}`}
          >
            {value === "all" ? t("studio.filterAllStatus") : t(`status.${value}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={filters.q ?? ""}
          onChange={(event) =>
            setFilters((current) => ({ ...current, q: event.target.value }))
          }
          placeholder={t("studio.search")}
          className="field flex-1"
        />
        <select
          value={filters.sort ?? "updated"}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              sort: event.target.value as StudioSort,
            }))
          }
          className="field sm:max-w-xs"
          aria-label={t("studio.sortLabel")}
        >
          {sorts.map((sort) => (
            <option key={sort.key} value={sort.key}>
              {sort.label}
            </option>
          ))}
        </select>
      </div>

      {selected.length > 0 ? (
        <div className="space-y-3 rounded-[20px] bg-paper-2 p-3 shadow-sm">
          <p className="text-sm font-medium">
            {t("studio.selected", { count: selected.length })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                askBulk({ published: true }, t("studio.confirmPublish"))
              }
            >
              {t("studio.bulkPublish")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                askBulk({ published: false }, t("studio.confirmUnpublish"))
              }
            >
              {t("studio.bulkUnpublish")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                askBulk({ status: "reserved" }, t("studio.confirmReserved"))
              }
            >
              {t("status.reserved")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => askBulk({ status: "sold" }, t("studio.confirmSold"))}
            >
              {t("status.sold")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                askBulk({ status: "in_stock" }, t("studio.confirmStock"))
              }
            >
              {t("status.in_stock")}
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="text-sm font-medium">{t("studio.bulkPrice")}</p>
            <select
              value={priceMode}
              onChange={(event) =>
                setPriceMode(event.target.value as "percent" | "delta")
              }
              className="field sm:max-w-[10rem]"
            >
              <option value="percent">{t("studio.pricePercent")}</option>
              <option value="delta">{t("studio.priceDelta")}</option>
            </select>
            <input
              value={priceValue}
              onChange={(event) => setPriceValue(event.target.value)}
              placeholder={
                priceMode === "percent"
                  ? t("studio.pricePercentPlaceholder")
                  : t("studio.priceDeltaPlaceholder")
              }
              className="field sm:max-w-[10rem]"
              inputMode="decimal"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={askBulkPrice}
            >
              {t("studio.applyPrice")}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[20px] bg-paper-2 p-4 text-sm">
          <p className="text-sold">{error}</p>
          <button
            type="button"
            className="btn btn-secondary mt-2"
            onClick={() => void reload()}
          >
            {t("studio.retry")}
          </button>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-muted">{t("studio.loading")}</p> : null}

      {!loading && visible.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-rule bg-paper-2 px-6 py-14 text-center">
          <p className="text-lg font-semibold">{t("studio.emptyTitle")}</p>
          <p className="mt-2 text-sm text-muted">{t("studio.empty")}</p>
          <Link
            href="/studio/new"
            className="btn btn-primary mt-5 inline-flex min-h-11"
          >
            {t("header.addItem")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((entry) => {
            const gaps = missingFields(entry);
            return (
              <li
                key={entry.id}
                className="flex gap-3 rounded-[24px] bg-paper-2 p-3 shadow-sm"
              >
                <input
                  type="checkbox"
                  className="mt-4 size-5 shrink-0"
                  checked={selected.includes(entry.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, entry.id]
                        : current.filter((id) => id !== entry.id),
                    )
                  }
                />
                <Link
                  href={`/studio/items/${entry.id}`}
                  className="flex min-w-0 flex-1 gap-3"
                >
                  <CoverPhoto
                    src={entry.photos[0]}
                    alt=""
                    className="size-20 shrink-0"
                    emptyLabel={t("form.noPhoto")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-olive">
                      {entry.code}
                    </p>
                    <p className="truncate font-semibold">{entry.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {entry.published
                        ? t("studio.filterPublished")
                        : t("studio.filterDrafts")}
                      {" · "}
                      {t(`status.${entry.status}`)}
                      {entry.price != null
                        ? ` · ${entry.price} ${currencySymbol}`
                        : ""}
                    </p>
                    {gaps.length > 0 ? (
                      <p className="mt-1 text-xs text-sold">
                        {gaps
                          .map((field) => t(`form.missing.${field}`))
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </Link>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void duplicateOne(entry.id)}
                  className="btn btn-secondary mt-3 shrink-0 self-start text-xs"
                >
                  {t("studio.duplicate")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        body={confirm?.body ?? ""}
        confirmLabel={t("studio.confirmOk")}
        cancelLabel={t("form.cancel")}
        pending={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void confirm?.run()}
      />
    </div>
  );
}
