import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { LoginForm } from "@/components/studio/LoginForm";
import { Link } from "@/i18n/navigation";
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
    <div className="flex min-h-full flex-col">
      <Header shop={shop} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <div className="rounded-[1.75rem] border border-rule/80 bg-paper-2 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive">
            {t("header.sellerStudio")}
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
            {t("studio.enter")}
          </h1>
          <p className="mt-2 text-sm text-muted">{t("studio.inviteOnly")}</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
        <Link
          href="/"
          className="mt-6 text-center text-sm font-medium text-olive-deep hover:underline"
        >
          {t("item.back")}
        </Link>
      </main>
    </div>
  );
}
