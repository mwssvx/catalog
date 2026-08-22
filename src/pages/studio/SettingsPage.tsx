import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StudioShell } from "@/components/studio/StudioShell";
import { ShopSettingsForm } from "@/components/studio/ShopSettingsForm";
import { api } from "@/lib/api";
import type { Shop } from "@/lib/catalog/types";

export function SettingsPage() {
  const { t } = useTranslation();
  const [shop, setShop] = useState<Shop | null>(null);

  useEffect(() => {
    void api<{ shop: Shop }>("/api/v1/shop").then((res) =>
      setShop(res.shop as Shop),
    );
  }, []);

  if (!shop) return <p className="p-8 text-muted">{t("common.loading")}</p>;

  return (
    <StudioShell shop={shop}>
      <ShopSettingsForm shop={shop} />
    </StudioShell>
  );
}
