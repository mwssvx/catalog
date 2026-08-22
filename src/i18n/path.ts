import {
  defaultLocale,
  locales,
  type AppLocale,
} from "@/i18n";

export function localeFromPath(pathname: string): AppLocale {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment && locales.includes(segment as AppLocale)) {
    return segment as AppLocale;
  }
  return defaultLocale;
}

export function stripLocale(pathname: string): string {
  const locale = localeFromPath(pathname);
  if (locale === defaultLocale) return pathname || "/";
  if (pathname === `/${locale}`) return "/";
  if (pathname.startsWith(`/${locale}/`)) {
    return pathname.slice(locale.length + 1) || "/";
  }
  return pathname;
}

/** Prefix a path with the active locale; keep `?query` and `#hash` intact. */
export function withLocale(path: string, locale: AppLocale): string {
  const raw = path.startsWith("/") ? path : `/${path}`;
  const match = /^(.*?)(\?[^#]*)?(#.*)?$/.exec(raw);
  const pathname = match?.[1] && match[1].length > 0 ? match[1] : "/";
  const search = match?.[2] ?? "";
  const hash = match?.[3] ?? "";

  let localized: string;
  if (locale === defaultLocale) {
    localized = pathname || "/";
  } else if (pathname === "/") {
    localized = `/${locale}`;
  } else {
    localized = `/${locale}${pathname}`;
  }

  return `${localized}${search}${hash}`;
}
