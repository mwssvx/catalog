import { useTranslation } from "react-i18next";
import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const { t } = useTranslation();
  const router = useRouter();

  async function logout() {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="btn btn-secondary"
    >
      {t("studio.signOut")}
    </button>
  );
}
