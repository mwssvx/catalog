import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "ky"],
  defaultLocale: "ru",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
