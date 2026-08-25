import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StudioShell } from "@/components/studio/StudioShell";
import { ItemForm } from "@/components/studio/ItemForm";
import { useParams } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { Item, Shop } from "@/lib/catalog/types";

export function EditItemPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const [shopRes, itemRes] = await Promise.all([
          api<{ shop: Shop }>("/api/v1/shop"),
          api<{ item: Item }>(`/api/v1/items/${id}`),
        ]);
        setShop(shopRes.shop as Shop);
        setItem(itemRes.item);
      } catch {
        setMissing(true);
      }
    })();
  }, [id]);

  if (missing) return <p className="p-8 text-muted">{t("common.notFound")}</p>;
  if (!shop || !item) return <p className="p-8 text-muted">{t("common.loading")}</p>;

  return (
    <StudioShell shop={shop}>
      <ItemForm
        item={item}
        currencySymbol={shop.currencySymbol}
        categories={shop.categories}
      />
    </StudioShell>
  );
}
