import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StudioDashboard } from "@/components/studio/StudioDashboard";
import { StudioShell } from "@/components/studio/StudioShell";
import { StudioWorkbench } from "@/components/studio/StudioWorkbench";
import { api } from "@/lib/api";
import type { Item, Shop } from "@/lib/catalog/types";

export function StudioHomePage() {
  const { t } = useTranslation();
  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<Item[]>([]);

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

  if (!shop) return <p className="p-8 text-muted">{t("common.loading")}</p>;

  return (
    <StudioShell shop={shop}>
      <div className="space-y-6">
        <StudioDashboard shop={shop} items={items} />
        <StudioWorkbench
          initialItems={items}
          currencySymbol={shop.currencySymbol}
        />
      </div>
    </StudioShell>
  );
}
