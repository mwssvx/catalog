import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StudioDashboard } from "@/components/studio/StudioDashboard";
import { StudioShell } from "@/components/studio/StudioShell";
import { StudioWorkbench } from "@/components/studio/StudioWorkbench";
import { useSearchParams } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { Item, Shop } from "@/lib/catalog/types";

export function StudioHomePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const notice = searchParams.get("notice");

  useEffect(() => {
    void (async () => {
      const [shopRes, itemsRes] = await Promise.all([
        api<{ shop: Shop }>("/api/v1/shop"),
        api<{ items: Item[] }>("/api/v1/items?status=all&published=all"),
      ]);
      setShop(shopRes.shop as Shop);
      setItems(itemsRes.items);
    })();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete("notice");
      setSearchParams(next, { replace: true });
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [notice, searchParams, setSearchParams]);

  if (!shop) return <p className="p-8 text-muted">{t("common.loading")}</p>;

  return (
    <StudioShell shop={shop}>
      <div className="space-y-6">
        {notice === "live" ? (
          <p
            role="status"
            className="rounded-[22px] bg-olive/15 px-4 py-3 text-sm font-medium text-ink"
          >
            {t("studio.noticeLive")}
          </p>
        ) : null}
        {notice === "draft" ? (
          <p
            role="status"
            className="rounded-[22px] bg-paper-2 px-4 py-3 text-sm font-medium text-muted shadow-sm"
          >
            {t("studio.noticeDraft")}
          </p>
        ) : null}
        <StudioDashboard shop={shop} items={items} />
        <StudioWorkbench
          initialItems={items}
          currencySymbol={shop.currencySymbol}
        />
      </div>
    </StudioShell>
  );
}
