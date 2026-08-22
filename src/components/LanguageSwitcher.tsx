import i18n, { locales, type AppLocale } from "@/i18n";
import {
  stripLocale,
  useLocale,
  usePathname,
  withLocale,
} from "@/i18n/navigation";
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

  void stripLocale;

  return (
    <div className="flex rounded-[14px] border border-rule bg-paper p-1">
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          className={
            locale === code
              ? "chip is-active px-2.5 py-1 text-xs"
              : "chip border-transparent bg-transparent px-2.5 py-1 text-xs text-muted"
          }
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
