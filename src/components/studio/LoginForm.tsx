import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@/i18n/navigation";

export function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setPending(false);
    if (!response.ok) {
      setError(t("studio.wrongPassword"));
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    if (next?.startsWith("/")) {
      router.push(next);
      return;
    }
    router.push("/studio");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="text-sm font-medium text-muted">
          {t("studio.email")}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field mt-2"
          autoFocus
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-muted">
          {t("studio.password")}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field mt-2"
          required
        />
      </div>
      {error ? <p className="text-sm text-sold">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full min-h-12 py-3"
      >
        {pending ? t("studio.opening") : t("studio.enter")}
      </button>
    </form>
  );
}
