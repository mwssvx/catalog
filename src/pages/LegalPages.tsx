import { useTranslation } from "react-i18next";
import { Footer } from "@/components/Footer";
import { Link } from "@/i18n/navigation";

export function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-8">
        <Link href="/" className="text-sm font-medium text-olive hover:underline">
          {t("legal.back")}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {t("legal.privacyTitle")}
        </h1>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {t("legal.privacyBody")}
        </p>
      </main>
      <Footer />
    </div>
  );
}

export function TermsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-8">
        <Link href="/" className="text-sm font-medium text-olive hover:underline">
          {t("legal.back")}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {t("legal.termsTitle")}
        </h1>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {t("legal.termsBody")}
        </p>
      </main>
      <Footer />
    </div>
  );
}
