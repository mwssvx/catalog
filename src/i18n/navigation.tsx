import {
  Link as RouterLink,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  type LinkProps,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { AppLocale } from "@/i18n";
import {
  localeFromPath,
  stripLocale,
  withLocale,
} from "@/i18n/path";

export { localeFromPath, stripLocale, withLocale };

export function useLocale(): AppLocale {
  const location = useLocation();
  return localeFromPath(location.pathname);
}

export function usePathname(): string {
  const location = useLocation();
  return stripLocale(location.pathname);
}

export function useRouter() {
  const navigate = useNavigate();
  const locale = useLocale();
  return {
    push: (path: string) => navigate(withLocale(path, locale)),
    replace: (path: string, options?: { locale?: AppLocale }) =>
      navigate(withLocale(path, options?.locale ?? locale), { replace: true }),
    back: () => navigate(-1),
  };
}

export function Link({
  href,
  to,
  ...props
}: Omit<LinkProps, "to"> & { href?: string; to?: string }) {
  const locale = useLocale();
  const target = href ?? to ?? "/";
  return <RouterLink {...props} to={withLocale(target, locale)} />;
}

export function useAppNavigate() {
  const navigate = useNavigate();
  const locale = useLocale();
  return (path: string, options?: { replace?: boolean }) =>
    navigate(withLocale(path, locale), options);
}

export function LocaleRedirect({ to }: { to: string }) {
  const locale = useLocale();
  return <Navigate to={withLocale(to, locale)} replace />;
}

export {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  useTranslation,
};
