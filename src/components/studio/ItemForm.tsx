"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { CoverPhoto } from "@/components/CoverPhoto";
import { useRouter } from "@/i18n/navigation";
import { parseNotes } from "@/lib/catalog/parse";
import {
  CATEGORIES,
  CONDITIONS,
  STATUSES,
  type Item,
} from "@/lib/catalog/types";

type ItemFormProps = {
  item?: Item;
};

export function ItemForm({ item }: ItemFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [price, setPrice] = useState(item?.price?.toString() ?? "");
  const [sizes, setSizes] = useState((item?.sizes ?? []).join(", "));
  const [quantity, setQuantity] = useState(item?.quantity?.toString() ?? "");
  const [material, setMaterial] = useState(item?.material ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [condition, setCondition] = useState(item?.condition ?? "");
  const [status, setStatus] = useState(item?.status ?? "in_stock");
  const [photos, setPhotos] = useState<string[]>(item?.photos ?? []);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState({
    title: Boolean(item),
    price: Boolean(item),
    sizes: Boolean(item),
    quantity: Boolean(item),
    material: Boolean(item),
    category: Boolean(item),
    condition: Boolean(item),
  });

  const parsed = useMemo(() => parseNotes(notes), [notes]);

  const stackedTitle = touched.title ? title : parsed.title;
  const stackedPrice = touched.price ? price : parsed.price?.toString() ?? "";
  const stackedSizes = touched.sizes ? sizes : parsed.sizes.join(", ");
  const stackedQuantity = touched.quantity
    ? quantity
    : parsed.quantity?.toString() ?? "";
  const stackedMaterial = touched.material ? material : parsed.material ?? "";
  const stackedCategory = touched.category ? category : parsed.category ?? "";
  const stackedCondition = touched.condition ? condition : parsed.condition ?? "";

  async function onFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const data = new FormData();
    for (const file of Array.from(fileList)) data.append("files", file);
    const response = await fetch("/api/v1/uploads", { method: "POST", body: data });
    const payload = (await response.json()) as { urls?: string[]; error?: string };
    if (!response.ok) {
      setError(payload.error || t("form.uploadError"));
      return;
    }
    setPhotos((current) => [...current, ...(payload.urls ?? [])]);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");

    const body = {
      notes,
      title: stackedTitle,
      price: stackedPrice ? Number(stackedPrice) : null,
      sizes: stackedSizes
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean),
      quantity: stackedQuantity ? Number(stackedQuantity) : null,
      material: stackedMaterial || null,
      category: stackedCategory || null,
      condition: stackedCondition || null,
      status,
      photos,
    };

    const response = await fetch(item ? `/api/v1/items/${item.id}` : "/api/v1/items", {
      method: item ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as { item?: Item; error?: string };
    setPending(false);

    if (!response.ok || !payload.item) {
      setError(payload.error || t("form.saveError"));
      return;
    }

    router.push("/studio");
    router.refresh();
  }

  async function onDelete() {
    if (!item) return;
    if (!confirm(t("form.confirmRemove"))) return;
    setPending(true);
    await fetch(`/api/v1/items/${item.id}`, { method: "DELETE" });
    router.push("/studio");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-4 rounded-[28px] bg-paper-2 p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-muted">{t("form.messyIn")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {item ? t("form.editItem") : t("form.addItem")}
          </h1>
          <p className="mt-2 max-w-md text-muted">{t("form.help")}</p>
        </div>

        <label className="block cursor-pointer rounded-[24px] border border-dashed border-rule bg-paper px-6 py-10 text-center">
          <span className="text-lg font-semibold">{t("form.addPhotos")}</span>
          <span className="mt-2 block text-sm text-muted">{t("form.photoHint")}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(event) => onFiles(event.target.files)}
          />
        </label>

        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {photos.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setPhotos((current) => current.filter((photo) => photo !== src))}
                className="group relative"
                title={t("form.removePhoto")}
              >
                <CoverPhoto
                  src={src}
                  alt=""
                  className="aspect-square"
                  emptyLabel={t("form.noPhoto")}
                />
                <span className="absolute inset-x-2 bottom-2 hidden rounded-[10px] bg-white/90 py-1 text-xs font-medium group-hover:block">
                  {t("form.removePhoto")}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div>
          <label htmlFor="notes" className="text-sm font-medium text-muted">
            {t("form.notes")}
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            placeholder={t("form.notesPlaceholder")}
            className="field mt-2"
          />
        </div>
      </section>

      <section className="space-y-5 rounded-[28px] bg-paper-2 p-6 shadow-sm">
        <p className="text-sm font-medium text-muted">{t("form.stacked")}</p>

        <Field label={t("form.title")}>
          <input
            value={stackedTitle}
            onChange={(event) => {
              setTouched((current) => ({ ...current, title: true }));
              setTitle(event.target.value);
            }}
            className="field"
            placeholder={t("form.titlePlaceholder")}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("form.price")}>
            <input
              value={stackedPrice}
              onChange={(event) => {
                setTouched((current) => ({ ...current, price: true }));
                setPrice(event.target.value);
              }}
              className="field"
              inputMode="numeric"
              placeholder="1500"
            />
          </Field>
          <Field label={t("form.quantity")}>
            <input
              value={stackedQuantity}
              onChange={(event) => {
                setTouched((current) => ({ ...current, quantity: true }));
                setQuantity(event.target.value);
              }}
              className="field"
              inputMode="numeric"
              placeholder="3"
            />
          </Field>
        </div>

        <Field label={t("form.sizes")}>
          <input
            value={stackedSizes}
            onChange={(event) => {
              setTouched((current) => ({ ...current, sizes: true }));
              setSizes(event.target.value);
            }}
            className="field"
            placeholder="M, L"
          />
        </Field>

        <Field label={t("form.material")}>
          <input
            value={stackedMaterial}
            onChange={(event) => {
              setTouched((current) => ({ ...current, material: true }));
              setMaterial(event.target.value);
            }}
            className="field"
            placeholder={t("form.materialPlaceholder")}
          />
        </Field>

        <Field label={t("form.kind")}>
          <select
            value={stackedCategory}
            onChange={(event) => {
              setTouched((current) => ({ ...current, category: true }));
              setCategory(event.target.value);
            }}
            className="field"
          >
            <option value="">{t("category.unsorted")}</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`category.${value}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("form.condition")}>
          <select
            value={stackedCondition}
            onChange={(event) => {
              setTouched((current) => ({ ...current, condition: true }));
              setCondition(event.target.value);
            }}
            className="field"
          >
            <option value="">{t("condition.unset")}</option>
            {CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {t(`condition.${value}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("form.status")}>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as Item["status"])}
            className="field"
          >
            {STATUSES.filter((value) => value !== "hidden").map((value) => (
              <option key={value} value={value}>
                {t(`status.${value}`)}
              </option>
            ))}
          </select>
        </Field>

        {error ? <p className="text-sm text-sold">{error}</p> : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[16px] bg-ink px-5 py-3 font-medium text-white disabled:opacity-60"
          >
            {pending
              ? t("form.saving")
              : item
                ? t("form.save")
                : t("form.putInCatalog")}
          </button>
          {item ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-[16px] bg-paper px-5 py-3 font-medium text-sold"
            >
              {t("form.remove")}
            </button>
          ) : null}
        </div>
      </section>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
