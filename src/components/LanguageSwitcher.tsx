import i18n, { locales, type AppLocale } from "@/i18n";
import { useLocale, usePathname, withLocale } from "@/i18n/navigation";
import { useNavigate, useSearchParams } from "react-router-dom";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  function switchTo(next: AppLocale) {
    void i18n.changeLanguage(next);
    const query = searchParams.toString();
    const path = withLocale(pathname || "/", next);
    navigate(query ? `${path}?${query}` : path, { replace: true });
  }

  return (
    <div className="flex rounded-[1rem] border border-rule bg-paper p-1">
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          className={
            locale === code
              ? "rounded-[0.75rem] bg-olive-deep px-2.5 py-1.5 text-xs font-semibold text-white"
              : "rounded-[0.75rem] px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:text-ink"
          }
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
