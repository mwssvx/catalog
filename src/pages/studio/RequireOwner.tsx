import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";
import { useLocale, withLocale } from "@/i18n/navigation";
import { api } from "@/lib/api";

export function RequireOwner({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "ok" | "deny">("loading");
  const location = useLocation();
  const locale = useLocale();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await api<{ ok: boolean }>("/api/v1/auth/me");
        if (!cancelled) setState(me.ok ? "ok" : "deny");
      } catch {
        if (!cancelled) setState("deny");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return <p className="p-8 text-muted">{t("common.loading")}</p>;
  }
  if (state === "deny") {
    const login = withLocale("/studio/login", locale);
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${login}?next=${next}`} replace />;
  }
  return children;
}
