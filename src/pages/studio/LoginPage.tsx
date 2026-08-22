import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { LoginForm } from "@/components/studio/LoginForm";
import { api } from "@/lib/api";
import type { Shop } from "@/lib/catalog/types";

export function LoginPage() {
  const { t } = useTranslation();
  const [shop, setShop] = useState<Shop | null>(null);

  useEffect(() => {
    void api<{ shop: Shop }>("/api/v1/shop").then((res) =>
      setShop(res.shop as Shop),
    );
  }, []);

  if (!shop) return <p className="p-8 text-muted">{t("common.loading")}</p>;

  return (
    <div className="min-h-full">
      <Header shop={shop} />
      <main className="mx-auto max-w-md px-5 py-10">
        <LoginForm />
      </main>
    </div>
  );
}
