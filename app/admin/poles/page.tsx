import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  createBusinessUnit,
  deleteBusinessUnit,
  getBusinessUnits,
  updateBusinessUnit,
  type BusinessUnit,
} from "@/lib/data/business";
import AdminBusinessUnits from "@/components/admin/AdminBusinessUnits";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default async function AdminPolesPage() {
  await requireAdmin();
  const items = await getBusinessUnits();

  async function createAction(formData: FormData) {
    "use server";
    await requireAdmin();

    const title = String(formData.get("title") ?? "").trim();
    const slugRaw = String(formData.get("slug") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const orderIndex = Number(formData.get("order_index") ?? 0);

    if (!title) throw new Error("Titre requis.");

    const slug = slugRaw ? slugify(slugRaw) : slugify(title);

    await createBusinessUnit({
      title,
      slug,
      summary: summary || null,
      order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
    });

    revalidatePath("/admin/poles");
    revalidatePath("/");
  }

  async function updateAction(formData: FormData) {
    "use server";
    await requireAdmin();

    const id = String(formData.get("id") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    const slugRaw = String(formData.get("slug") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const orderIndex = Number(formData.get("order_index") ?? 0);

    if (!id) throw new Error("ID manquant.");
    if (!title) throw new Error("Titre requis.");

    const slug = slugRaw ? slugify(slugRaw) : slugify(title);

    await updateBusinessUnit(id, {
      title,
      slug,
      summary: summary || null,
      order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
    });

    revalidatePath("/admin/poles");
    revalidatePath("/");
  }

  async function deleteAction(formData: FormData) {
    "use server";
    await requireAdmin();

    const id = String(formData.get("id") ?? "");
    if (!id) throw new Error("ID manquant.");

    await deleteBusinessUnit(id);

    revalidatePath("/admin/poles");
    revalidatePath("/");
  }

  return (
    <div className="py-10">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Pôles d’activités
        </h1>
        <p className="mt-2 text-slate-600">
          Créer, modifier, supprimer et ordonner les pôles.
        </p>
      </div>

      <AdminBusinessUnits
        items={items as BusinessUnit[]}
        createAction={createAction}
        updateAction={updateAction}
        deleteAction={deleteAction}
      />
    </div>
  );
}
