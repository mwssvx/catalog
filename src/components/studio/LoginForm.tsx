"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

export function LoginForm() {
  const t = useTranslations("studio");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPending(false);
    if (!response.ok) {
      setError(t("wrongPassword"));
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) {
      window.location.assign(next);
      return;
    }
    router.push("/studio");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="password" className="text-sm font-medium text-muted">
          {t("password")}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field mt-2"
          autoFocus
        />
      </div>
      {error ? <p className="text-sm text-sold">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[16px] bg-ink py-3 font-medium text-white disabled:opacity-60"
      >
        {pending ? t("opening") : t("enter")}
      </button>
      <p className="text-center text-sm text-muted">
        {t("passwordHint", { password: "studio" })}
      </p>
    </form>
  );
}
