import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "../../messages/ru.json";
import ky from "../../messages/ky.json";

export const locales = ["ru", "ky"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "ru";

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    ky: { translation: ky },
  },
  lng: defaultLocale,
  fallbackLng: defaultLocale,
  interpolation: { escapeValue: false },
});

export default i18n;
