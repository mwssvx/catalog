import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MediaPicker, type MediaSlot } from "@/components/studio/MediaPicker";
import { LogoutButton } from "@/components/studio/LogoutButton";
import { persistableUrl } from "@/lib/media/delivery";
import {
  categoryLabel,
  isPlaceholderWhatsapp,
  whatsappDigits,
  whatsappHref,
} from "@/lib/catalog/format";
import type { Shop } from "@/lib/catalog/types";

function slotsFromUrl(url: string | undefined): MediaSlot[] {
  return url ? [{ url, kind: "image" }] : [];
}

function SettingsBlock({
  step,
  title,
  help,
  children,
}: {
  step: string;
  title: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-[24px] border border-rule/70 bg-paper-2 px-4 py-5 shadow-sm sm:px-5">
      <div>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-olive">
          {step}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{help}</p>
      </div>
      {children}
    </section>
  );
}

export function ShopSettingsForm({ shop }: { shop: Shop }) {
  const { t } = useTranslation(undefined, { keyPrefix: "settings" });
  const { t: rootT } = useTranslation();
  const { t: uploadT } = useTranslation(undefined, { keyPrefix: "form" });
  const [name, setName] = useState(shop.name);
  const [tagline, setTagline] = useState(shop.tagline);
  const [location, setLocation] = useState(shop.location);
  const [whatsapp, setWhatsapp] = useState(
    isPlaceholderWhatsapp(shop.whatsapp) ? "" : shop.whatsapp,
  );
  const [instagram, setInstagram] = useState(shop.instagram ?? "");
  const [telegram, setTelegram] = useState(shop.telegram ?? "");
  const [categories, setCategories] = useState<string[]>(
    shop.categories?.length ? [...shop.categories] : [],
  );
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, string>>(
    () => ({ ...(shop.categoryPhotos ?? {}) }),
  );
  const [newCategory, setNewCategory] = useState("");
  const [currency, setCurrency] = useState(shop.currency);
  const [currencySymbol, setCurrencySymbol] = useState(shop.currencySymbol);
  const [logo, setLogo] = useState<MediaSlot[]>(slotsFromUrl(shop.logoUrl));
  const [cover, setCover] = useState<MediaSlot[]>(slotsFromUrl(shop.coverUrl));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const labels = {
    remove: uploadT("removePhoto"),
    noPhoto: uploadT("noPhoto"),
    addPhotos: uploadT("addPhotos"),
    photoHint: uploadT("photoHint"),
    uploadProgress: uploadT("uploadProgress"),
    uploadError: uploadT("uploadError"),
    uploadPartial: uploadT("uploadPartial"),
    urlLabel: uploadT("urlLabel"),
    urlPlaceholder: uploadT("urlPlaceholder"),
    urlAdd: uploadT("urlAdd"),
    urlHelp: uploadT("urlHelp"),
    urlOptional: uploadT("urlOptional"),
    urlInvalid: uploadT("urlInvalid"),
  };

  function commitNewCategory(list: string[] = categories): string[] {
    const value = newCategory.trim();
    if (!value) return list;
    const next = list.includes(value) ? list : [...list, value];
    setCategories(next);
    setNewCategory("");
    return next;
  }

  function removeCategory(category: string) {
    setCategories((current) => current.filter((value) => value !== category));
    setCategoryPhotos((current) => {
      const next = { ...current };
      delete next[category];
      return next;
    });
  }

  function setCategoryPhoto(category: string, slots: MediaSlot[]) {
    const url = slots[0] ? persistableUrl(slots[0].url) : "";
    setCategoryPhotos((current) => {
      const next = { ...current };
      if (url) next[category] = url;
      else delete next[category];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    try {
      if (isPlaceholderWhatsapp(whatsapp) || whatsappDigits(whatsapp).length < 9) {
        throw new Error(t("whatsappRequired"));
      }
      const nextCategories = commitNewCategory();
      const response = await fetch("/api/v1/shop", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tagline,
          location,
          whatsapp: whatsappDigits(whatsapp),
          instagram: instagram.trim(),
          telegram: telegram.trim(),
          categories: nextCategories,
          categoryPhotos,
          currency,
          currencySymbol,
          logoUrl: logo[0] ? persistableUrl(logo[0].url) : "",
          coverUrl: cover[0] ? persistableUrl(cover[0].url) : "",
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        shop?: Shop;
      };
      if (!response.ok) {
        const message = payload.error || t("saveError");
        if (
          /pending\.sql|columns are missing|column .* does not exist|Could not find the '.+' column/i.test(
            message,
          )
        ) {
          throw new Error(t("schemaMissing"));
        }
        throw new Error(message);
      }
      if (payload.shop) {
        setInstagram(payload.shop.instagram ?? "");
        setTelegram(payload.shop.telegram ?? "");
        setCategories(
          payload.shop.categories?.length
            ? [...payload.shop.categories]
            : nextCategories,
        );
        setCategoryPhotos({
          ...(payload.shop.categoryPhotos ?? categoryPhotos),
        });
        setCover(
          slotsFromUrl(payload.shop.coverUrl || cover[0]?.url || ""),
        );
        setLogo(slotsFromUrl(payload.shop.logoUrl || logo[0]?.url || ""));
      }
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-5">
      <div className="rounded-[24px] bg-olive/10 px-4 py-4 sm:px-5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("help")}</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
          <li>{t("guideHero")}</li>
          <li>{t("guideCategories")}</li>
          <li>{t("guideSave")}</li>
        </ol>
      </div>

      <SettingsBlock
        step={t("step1")}
        title={t("cover")}
        help={t("coverHelp")}
      >
        <MediaPicker
          items={cover}
          onChange={setCover}
          labels={labels}
          maxFiles={1}
        />
      </SettingsBlock>

      <SettingsBlock
        step={t("step2")}
        title={t("categories")}
        help={t("categoriesHelp")}
      >
        <div className="space-y-4">
          {categories.map((category) => (
            <div
              key={category}
              className="space-y-3 rounded-[18px] border border-rule bg-paper px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {categoryLabel(category, rootT)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {t("categoriesPhotoHelp")}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary min-h-9 shrink-0 text-sold"
                  onClick={() => removeCategory(category)}
                >
                  {t("categoriesDelete")}
                </button>
              </div>
              <MediaPicker
                items={slotsFromUrl(categoryPhotos[category])}
                onChange={(slots) => setCategoryPhoto(category, slots)}
                labels={labels}
                maxFiles={1}
              />
            </div>
          ))}
        </div>

        <div className="rounded-[18px] border border-dashed border-rule bg-paper px-3 py-3">
          <p className="text-sm font-medium text-ink">{t("categoriesAddTitle")}</p>
          <p className="mt-1 text-xs text-muted">{t("categoriesAddHelp")}</p>
          <div className="mt-3 flex gap-2">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                commitNewCategory();
              }}
              className="field min-h-11 flex-1"
              placeholder={t("categoriesPlaceholder")}
            />
            <button
              type="button"
              className="btn btn-secondary min-h-11"
              onClick={() => commitNewCategory()}
            >
              {t("categoriesAdd")}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">{t("categoriesSaveHint")}</p>
        </div>
      </SettingsBlock>

      <SettingsBlock
        step={t("step3")}
        title={t("shopInfoTitle")}
        help={t("shopInfoHelp")}
      >
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("name")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field mt-2 min-h-11"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("tagline")}</span>
          <input
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            className="field mt-2 min-h-11"
            placeholder={t("taglinePlaceholder")}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("location")}</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="field mt-2 min-h-11"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("whatsapp")}</span>
          <input
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            className="field mt-2 min-h-11"
            placeholder={t("whatsappPlaceholder")}
          />
          <span className="mt-1 block text-xs text-muted">{t("whatsappHelp")}</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("instagram")}</span>
          <input
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
            className="field mt-2 min-h-11"
            placeholder={t("instagramPlaceholder")}
          />
          <span className="mt-1 block text-xs text-muted">{t("instagramHelp")}</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">{t("telegram")}</span>
          <input
            value={telegram}
            onChange={(event) => setTelegram(event.target.value)}
            className="field mt-2 min-h-11"
            placeholder={t("telegramPlaceholder")}
          />
          <span className="mt-1 block text-xs text-muted">{t("telegramHelp")}</span>
        </label>
        {whatsappHref(whatsapp, t("whatsappTestMessage", { shop: name })) ? (
          <a
            href={whatsappHref(whatsapp, t("whatsappTestMessage", { shop: name }))!}
            target="_blank"
            rel="noreferrer"
            className="btn btn-whatsapp"
          >
            {t("whatsappTest")}
          </a>
        ) : (
          <p className="text-sm text-muted">{t("whatsappTestHint")}</p>
        )}
      </SettingsBlock>

      <SettingsBlock
        step={t("step4")}
        title={t("extraTitle")}
        help={t("extraHelp")}
      >
        <div>
          <p className="text-sm font-medium text-muted">{t("logo")}</p>
          <p className="mt-1 text-xs text-muted">{t("logoHelp")}</p>
          <div className="mt-2">
            <MediaPicker
              items={logo}
              onChange={setLogo}
              labels={labels}
              maxFiles={1}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-muted">{t("currency")}</span>
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="field mt-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">{t("currencySymbol")}</span>
            <input
              value={currencySymbol}
              onChange={(event) => setCurrencySymbol(event.target.value)}
              className="field mt-2"
            />
          </label>
        </div>
      </SettingsBlock>

      {error ? <p className="text-sm text-sold">{error}</p> : null}
      {saved ? <p className="text-sm text-olive">{t("saved")}</p> : null}
      <div className="sticky bottom-3 z-10 rounded-[22px] border border-rule bg-paper-2/95 px-4 py-3 shadow-sm backdrop-blur">
        <p className="mb-2 text-xs text-muted">{t("saveBarHelp")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? t("saving") : t("save")}
          </button>
          <div className="sm:hidden">
            <LogoutButton />
          </div>
        </div>
      </div>
    </form>
  );
}
