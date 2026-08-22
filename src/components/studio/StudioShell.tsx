import { Header } from "@/components/Header";
import { StudioNav } from "@/components/studio/StudioNav";
import type { Shop } from "@/lib/catalog/types";

export function StudioShell({
  shop,
  children,
}: {
  shop: Shop;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full pb-24 sm:pb-8">
      <Header shop={shop} studio />
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-8">{children}</main>
      <StudioNav />
    </div>
  );
}
