
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/studio/ConfirmDialog";
import { MediaPicker, type MediaSlot } from "@/components/studio/MediaPicker";
import { useRouter } from "@/i18n/navigation";
import { parseNotes } from "@/lib/catalog/parse";
import { missingFields } from "@/lib/catalog/normalize";
import { persistableUrl } from "@/lib/media/delivery";
import { splitCsv } from "@/lib/catalog/studio-actions";
import {
  CATEGORIES,
  CONDITIONS,
  STATUSES,
  type Item,
  type ProductVariant,
} from "@/lib/catalog/types";

function slotsFrom(urls: string[], kind: "image" | "video"): MediaSlot[] {
  return urls.map((url) => ({ url, kind }));
}

function emptyVariant(): ProductVariant {
  return {
    id: crypto.randomUUID(),
    color: "",
    photos: [],
    videos: [],
  };
}

function asUuid(id: string): string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  )
    ? id
    : crypto.randomUUID();
}

type ItemFormProps = { item?: Item; currencySymbol?: string };

export function ItemForm({ item }: ItemFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price?.toString() ?? "");
  const [wholesalePrice, setWholesalePrice] = useState(
    item?.wholesalePrice?.toString() ?? "",
  );
  const [minWholesaleQty, setMinWholesaleQty] = useState(
    item?.minWholesaleQty?.toString() ?? "",
  );
  const [sizes, setSizes] = useState((item?.sizes ?? []).join(", "));
  const [quantity, setQuantity] = useState(item?.quantity?.toString() ?? "");
  const [material, setMaterial] = useState(item?.material ?? "");
  const [origin, setOrigin] = useState(item?.origin ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [subcategory, setSubcategory] = useState(item?.subcategory ?? "");
  const [condition, setCondition] = useState(item?.condition ?? "");
  const [tags, setTags] = useState((item?.tags ?? []).join(", "));
  const [collections, setCollections] = useState((item?.collections ?? []).join(", "));
  const [status, setStatus] = useState(item?.status ?? "in_stock");
  const [published, setPublished] = useState(item?.published ?? false);
  const [variants, setVariants] = useState<ProductVariant[]>(
    item?.variants?.length
      ? item.variants.map((variant) => ({
          ...variant,
          id: asUuid(variant.id),
        }))
      : [emptyVariant()],
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  const draftLike: Item = {
    id: item?.id ?? "draft",
    code: item?.code ?? "",
    title: stackedTitle || t("form.untitled"),
    notes,
    description,
    price: stackedPrice ? Number(stackedPrice) : null,
    wholesalePrice: wholesalePrice ? Number(wholesalePrice) : null,
    minWholesaleQty: minWholesaleQty ? Number(minWholesaleQty) : null,
    sizes: splitCsv(stackedSizes),
    quantity: stackedQuantity ? Number(stackedQuantity) : null,
    material: stackedMaterial || null,
    origin: origin || null,
    category: (stackedCategory || null) as Item["category"],
    subcategory: subcategory || null,
    condition: (stackedCondition || null) as Item["condition"],
    status,
    tags: splitCsv(tags),
    collections: splitCsv(collections),
    published,
    publishedAt: item?.publishedAt ?? null,
    photos: variants.flatMap((variant) => variant.photos),
    videos: variants.flatMap((variant) => variant.videos),
    variants,
    createdAt: item?.createdAt ?? new Date().toISOString(),
    updatedAt: item?.updatedAt ?? new Date().toISOString(),
  };
  const missing = missingFields(draftLike);

  function patchVariant(id: string, patch: Partial<ProductVariant>) {
    setVariants((current) =>
      current.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)),
    );
  }

  async function save(nextPublished = published) {
    setPending(true);
    setError("");
    const body = {
      notes,
      title: stackedTitle,
      description,
      price: stackedPrice ? Number(stackedPrice) : null,
      wholesalePrice: wholesalePrice ? Number(wholesalePrice) : null,
      minWholesaleQty: minWholesaleQty ? Number(minWholesaleQty) : null,
      sizes: splitCsv(stackedSizes),
      quantity: stackedQuantity ? Number(stackedQuantity) : null,
      material: stackedMaterial || null,
      origin: origin || null,
      category: stackedCategory || null,
      subcategory: subcategory || null,
      condition: stackedCondition || null,
      tags: splitCsv(tags),
      collections: splitCsv(collections),
      status,
      published: nextPublished,
      variants: variants.map((variant) => ({
        ...variant,
        color: variant.color?.trim() || null,
        photos: variant.photos.map((url) => persistableUrl(url)),
        videos: variant.videos.map((url) => persistableUrl(url)),
      })),
      photos: variants.flatMap((variant) => variant.photos.map((url) => persistableUrl(url))),
      videos: variants.flatMap((variant) => variant.videos.map((url) => persistableUrl(url))),
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
  }

  async function onDelete() {
    if (!item) return;
    setPending(true);
    await fetch(`/api/v1/items/${item.id}`, { method: "DELETE" });
    router.push("/studio");
  }

  const uploadLabels = {
    remove: t("form.removePhoto"),
    noPhoto: t("form.noPhoto"),
    urlLabel: t("form.urlLabel"),
    urlPlaceholder: t("form.urlPlaceholder"),
    urlAdd: t("form.urlAdd"),
    urlHelp: t("form.urlHelp"),
    urlExamplesTitle: t("form.urlExamplesTitle"),
    urlExamples: [
      t("form.urlExample1"),
      t("form.urlExample2"),
      t("form.urlExample3"),
    ],
    urlInvalid: t("form.urlInvalid"),
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
      className="space-y-4 pb-4"
    >
      <section className="space-y-4 rounded-[28px] bg-paper-2 p-5 shadow-sm">
        <div>
          <p className="text-sm font-medium text-muted">{t("form.messyIn")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {item ? t("form.editItem") : t("form.addItem")}
          </h1>
          <p className="mt-2 max-w-md text-muted">{t("form.help")}</p>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("form.notes")}</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder={t("form.notesPlaceholder")}
            className="field mt-2"
          />
        </label>
        {missing.length > 0 ? (
          <div className="rounded-[16px] bg-amber-50 px-4 py-3 text-sm">
            <p className="font-medium">{t("form.missingTitle")}</p>
            <p className="mt-1 text-muted">
              {missing.map((field) => t(`form.missing.${field}`)).join(" · ")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-olive">{t("form.ready")}</p>
        )}
      </section>

      <section className="space-y-4 rounded-[28px] bg-paper-2 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("form.variants")}</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setVariants((current) => [...current, emptyVariant()])}
          >
            {t("form.addColor")}
          </button>
        </div>
        <p className="text-sm text-muted">{t("form.variantsHelp")}</p>
        {variants.map((variant, index) => (
          <div key={variant.id} className="space-y-3 rounded-[20px] bg-paper p-4">
            <div className="flex items-center gap-2">
              <input
                value={variant.color ?? ""}
                onChange={(event) => patchVariant(variant.id, { color: event.target.value })}
                className="field"
                placeholder={t("form.colorPlaceholder")}
              />
              {variants.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-secondary shrink-0 text-sold"
                  onClick={() =>
                    setVariants((current) => current.filter((entry) => entry.id !== variant.id))
                  }
                >
                  {t("form.removeColor")}
                </button>
              ) : null}
            </div>
            <p className="text-xs font-medium text-muted">
              {t("form.colorN", { n: index + 1 })}
            </p>
            <MediaPicker
              items={[
                ...slotsFrom(variant.photos, "image"),
                ...slotsFrom(variant.videos, "video"),
              ]}
              onChange={(slots) =>
                patchVariant(variant.id, {
                  photos: slots.filter((slot) => slot.kind === "image").map((slot) => slot.url),
                  videos: slots.filter((slot) => slot.kind === "video").map((slot) => slot.url),
                })
              }
              labels={uploadLabels}
            />
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-[28px] bg-paper-2 p-5 shadow-sm">
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
        <Field label={t("form.description")}>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="field"
            placeholder={t("form.descriptionPlaceholder")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
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
          <Field label={t("form.wholesalePrice")}>
            <input
              value={wholesalePrice}
              onChange={(event) => setWholesalePrice(event.target.value)}
              className="field"
              inputMode="numeric"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("form.minWholesaleQty")}>
            <input
              value={minWholesaleQty}
              onChange={(event) => setMinWholesaleQty(event.target.value)}
              className="field"
              inputMode="numeric"
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
        <Field label={t("form.origin")}>
          <input
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            className="field"
            placeholder={t("form.originPlaceholder")}
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
        <Field label={t("form.subcategory")}>
          <input
            value={subcategory}
            onChange={(event) => setSubcategory(event.target.value)}
            className="field"
          />
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
        <Field label={t("form.tags")}>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="field"
            placeholder={t("form.tagsPlaceholder")}
          />
        </Field>
        <Field label={t("form.collections")}>
          <input
            value={collections}
            onChange={(event) => setCollections(event.target.value)}
            className="field"
            placeholder={t("form.collectionsPlaceholder")}
          />
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
        <label className="flex items-center gap-3 rounded-[16px] bg-paper px-4 py-3">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
          />
          <span className="text-sm font-medium">{t("form.published")}</span>
        </label>
        {error ? <p className="text-sm text-sold">{error}</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" disabled={pending} className="btn btn-secondary">
            {pending ? t("form.saving") : t("form.saveDraft")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void save(true)}
            className="btn btn-primary"
          >
            {t("form.publish")}
          </button>
          {item?.published ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void save(false)}
              className="btn btn-secondary"
            >
              {t("form.unpublish")}
            </button>
          ) : null}
          {item ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn btn-secondary text-sold"
            >
              {t("form.remove")}
            </button>
          ) : null}
        </div>
      </section>
      <ConfirmDialog
        open={confirmDelete}
        title={t("form.remove")}
        body={t("form.confirmRemove")}
        confirmLabel={t("form.remove")}
        cancelLabel={t("form.cancel")}
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
      />
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
