import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { locales } from "@/i18n";
import { DocumentMeta } from "@/components/DocumentMeta";
import { HomePage } from "@/pages/HomePage";
import { ItemPage } from "@/pages/ItemPage";
import { PrivacyPage, TermsPage } from "@/pages/LegalPages";
import { EditItemPage } from "@/pages/studio/EditItemPage";
import { LoginPage } from "@/pages/studio/LoginPage";
import { NewItemPage } from "@/pages/studio/NewItemPage";
import { RequireOwner } from "@/pages/studio/RequireOwner";
import { SettingsPage } from "@/pages/studio/SettingsPage";
import { StudioHomePage } from "@/pages/studio/StudioHomePage";

function KyRedirect({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const first = location.pathname.split("/").filter(Boolean)[0];
  if (
    first &&
    !locales.includes(first as (typeof locales)[number]) &&
    first !== "studio" &&
    first !== "item" &&
    first !== "api" &&
    first !== "privacy" &&
    first !== "terms"
  ) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/item/:id" element={<ItemPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/studio/login" element={<LoginPage />} />
      <Route
        path="/studio"
        element={
          <RequireOwner>
            <StudioHomePage />
          </RequireOwner>
        }
      />
      <Route
        path="/studio/new"
        element={
          <RequireOwner>
            <NewItemPage />
          </RequireOwner>
        }
      />
      <Route
        path="/studio/items/:id"
        element={
          <RequireOwner>
            <EditItemPage />
          </RequireOwner>
        }
      />
      <Route
        path="/studio/settings"
        element={
          <RequireOwner>
            <SettingsPage />
          </RequireOwner>
        }
      />
      <Route path="/ky" element={<HomePage />} />
      <Route path="/ky/item/:id" element={<ItemPage />} />
      <Route path="/ky/privacy" element={<PrivacyPage />} />
      <Route path="/ky/terms" element={<TermsPage />} />
      <Route path="/ky/studio/login" element={<LoginPage />} />
      <Route
        path="/ky/studio"
        element={
          <RequireOwner>
            <StudioHomePage />
          </RequireOwner>
        }
      />
      <Route
        path="/ky/studio/new"
        element={
          <RequireOwner>
            <NewItemPage />
          </RequireOwner>
        }
      />
      <Route
        path="/ky/studio/items/:id"
        element={
          <RequireOwner>
            <EditItemPage />
          </RequireOwner>
        }
      />
      <Route
        path="/ky/studio/settings"
        element={
          <RequireOwner>
            <SettingsPage />
          </RequireOwner>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <DocumentMeta />
      <KyRedirect>
        <AppRoutes />
      </KyRedirect>
    </BrowserRouter>
  );
}
