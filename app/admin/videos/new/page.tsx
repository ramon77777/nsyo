// app/admin/videos/new/page.tsx
import "server-only";
import Container from "@/components/layout/Container";
import NewHomeVideoForm from "./ui/NewHomeVideoForm";

export const dynamic = "force-dynamic";

export default async function NewHomeVideoPage() {
  return (
    <section className="bg-slate-50/50 py-10">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Admin • Home</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Ajouter une vidéo
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Upload direct dans Supabase Storage.
            </p>
          </div>
        </div>

        <NewHomeVideoForm />
      </Container>
    </section>
  );
}