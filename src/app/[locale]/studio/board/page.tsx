import { Header } from "@/components/Header";
import { OpenBoard } from "@/components/board/OpenBoard";
import { getShop } from "@/lib/catalog/store";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const shop = await getShop();

  return (
    <div className="min-h-full pb-6">
      <Header shop={shop} studio />
      <main className="px-3 pt-3 sm:px-5">
        <OpenBoard />
      </main>
    </div>
  );
}
