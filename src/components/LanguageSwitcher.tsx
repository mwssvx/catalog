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
    <div className="flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em]">
      {locales.map((code, index) => (
        <span key={code} className="flex items-center gap-1">
          {index > 0 ? <span className="text-rule">/</span> : null}
          <button
            type="button"
            onClick={() => switchTo(code)}
            className={
              locale === code
                ? "text-ink"
                : "text-muted transition hover:text-ink"
            }
          >
            {code}
          </button>
        </span>
      ))}
    </div>
  );
}
