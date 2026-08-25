import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MediaPicker, type MediaSlot } from "@/components/studio/MediaPicker";
import { LogoutButton } from "@/components/studio/LogoutButton";
import { persistableUrl } from "@/lib/media/delivery";
import {
  isPlaceholderWhatsapp,
  whatsappDigits,
  whatsappHref,
} from "@/lib/catalog/format";
import type { Shop } from "@/lib/catalog/types";

export function ShopSettingsForm({ shop }: { shop: Shop }) {
  const { t } = useTranslation(undefined, { keyPrefix: "settings" });
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
  const [newCategory, setNewCategory] = useState("");
  const [currency, setCurrency] = useState(shop.currency);
  const [currencySymbol, setCurrencySymbol] = useState(shop.currencySymbol);
  const [logo, setLogo] = useState<MediaSlot[]>(
    shop.logoUrl ? [{ url: shop.logoUrl, kind: "image" }] : [],
  );
  const [cover, setCover] = useState<MediaSlot[]>(
    shop.coverUrl ? [{ url: shop.coverUrl, kind: "image" }] : [],
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const labels = {
    remove: uploadT("removePhoto"),
    noPhoto: uploadT("noPhoto"),
    urlLabel: uploadT("urlLabel"),
    urlPlaceholder: uploadT("urlPlaceholder"),
    urlAdd: uploadT("urlAdd"),
    urlHelp: uploadT("urlHelp"),
    urlExamplesTitle: uploadT("urlExamplesTitle"),
    urlExamples: [
      uploadT("urlExample1"),
      uploadT("urlExample2"),
      uploadT("urlExample3"),
    ],
    urlInvalid: uploadT("urlInvalid"),
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    try {
      if (isPlaceholderWhatsapp(whatsapp) || whatsappDigits(whatsapp).length < 9) {
        throw new Error(t("whatsappRequired"));
      }
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
          categories,
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
        if (/instagram|telegram|categories|logo|cover|pending\.sql|columns are missing/i.test(message)) {
          throw new Error(t("schemaMissing"));
        }
        throw new Error(message);
      }
      if (payload.shop) {
        setInstagram(payload.shop.instagram ?? "");
        setTelegram(payload.shop.telegram ?? "");
        setCategories(
          payload.shop.categories?.length ? [...payload.shop.categories] : [],
        );
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
          inputMode="tel"
          placeholder={t("whatsappPlaceholder")}
          required
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
      <div>
        <p className="text-sm font-medium text-muted">{t("categories")}</p>
        <p className="mt-1 text-xs text-muted">{t("categoriesHelp")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className="chip min-h-10"
              onClick={() =>
                setCategories((current) => current.filter((value) => value !== category))
              }
            >
              {category} ×
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            className="field min-h-11 flex-1"
            placeholder={t("categoriesPlaceholder")}
          />
          <button
            type="button"
            className="btn btn-secondary min-h-11"
            onClick={() => {
              const value = newCategory.trim();
              if (!value) return;
              setCategories((current) =>
                current.includes(value) ? current : [...current, value],
              );
              setNewCategory("");
            }}
          >
            {t("categoriesAdd")}
          </button>
        </div>
      </div>
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
      <div>
        <p className="text-sm font-medium text-muted">{t("logo")}</p>
        <div className="mt-2">
          <MediaPicker
            items={logo}
            onChange={(slots) => setLogo(slots.slice(-1))}
            labels={labels}
          />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-muted">{t("cover")}</p>
        <div className="mt-2">
          <MediaPicker
            items={cover}
            onChange={(slots) => setCover(slots.slice(-1))}
            labels={labels}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-sold">{error}</p> : null}
      {saved ? <p className="text-sm text-olive">{t("saved")}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? t("saving") : t("save")}
        </button>
        <div className="sm:hidden">
          <LogoutButton />
        </div>
      </div>
    </form>
  );
}
