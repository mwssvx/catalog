"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const t = useTranslations("studio");
  const router = useRouter();

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-[14px] bg-paper px-4 py-2 text-sm font-medium text-muted hover:text-ink"
    >
      {t("signOut")}
    </button>
  );
}
