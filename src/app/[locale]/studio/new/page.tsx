import { Header } from "@/components/Header";
import { ItemForm } from "@/components/studio/ItemForm";
import { getShop } from "@/lib/catalog/store";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const shop = await getShop();

  return (
    <div className="min-h-full">
      <Header shop={shop} studio />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <ItemForm />
      </main>
    </div>
  );
}
