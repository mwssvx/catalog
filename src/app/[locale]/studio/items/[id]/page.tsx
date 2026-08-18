import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { ItemForm } from "@/components/studio/ItemForm";
import { getItem, getShop } from "@/lib/catalog/store";

export const dynamic = "force-dynamic";

type EditItemPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EditItemPage({ params }: EditItemPageProps) {
  const { id } = await params;
  const [shop, item] = await Promise.all([getShop(), getItem(id)]);
  if (!item) notFound();

  return (
    <div className="min-h-full">
      <Header shop={shop} studio />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <ItemForm item={item} />
      </main>
    </div>
  );
}
