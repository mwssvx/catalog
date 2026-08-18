import { getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { LoginForm } from "@/components/studio/LoginForm";
import { getShop } from "@/lib/catalog/store";

export const dynamic = "force-dynamic";

export default async function StudioLoginPage() {
  const t = await getTranslations("studio");
  const shop = await getShop();

  return (
    <div className="min-h-full">
      <Header shop={shop} />
      <main className="px-5 py-16">
        <div className="mx-auto max-w-md rounded-[28px] bg-paper-2 p-8 shadow-sm">
          <p className="text-sm font-medium text-muted">{t("sellersOnly")}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("openStudio")}</h1>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
