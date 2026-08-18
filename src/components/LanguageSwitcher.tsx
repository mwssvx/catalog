"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function switchTo(next: AppLocale) {
    const query = searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { locale: next });
  }

  return (
    <div className="flex rounded-[14px] bg-paper p-1">
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          className={
            locale === code
              ? "rounded-[10px] bg-ink px-2.5 py-1 text-xs font-semibold text-white"
              : "rounded-[10px] px-2.5 py-1 text-xs font-semibold text-muted"
          }
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
