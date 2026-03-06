// app/admin/pages/[id]/page.tsx
import "server-only";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/layout/Container";
import { supabaseServerReadonly } from "@/lib/supabase/server";
import { updatePageAction, upsertBlockAction, deleteBlockAction } from "../actions";

export const dynamic = "force-dynamic";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  updated_at: string;
};

type BlockRow = {
  id: string;
  page_id: string;
  key: string;
  type: "text" | "richtext" | "list" | "json";
  value: any;
  order_index: number;
  updated_at: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function cleanText(v: unknown) {
  return String(v ?? "").trim();
}

function safeJsonStringify(v: any) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{\n  \n}";
  }
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "slate";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-slate-700">{children}</div>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900",
        "outline-none focus:ring-2 focus:ring-amber-300",
        props.className
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900",
        "outline-none focus:ring-2 focus:ring-amber-300",
        props.className
      )}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900",
        "font-mono outline-none focus:ring-2 focus:ring-amber-300",
        props.className
      )}
    />
  );
}

/** Wrappers "use server" => garantit un action type compatible <form action> (Promise<void>) */
async function updatePage(formData: FormData): Promise<void> {
  "use server";
  const res = await updatePageAction(formData);
  if (res && typeof res === "object" && "ok" in res && (res as any).ok === false) {
    const msg = encodeURIComponent(String((res as any).message ?? "Erreur"));
    redirect(`/admin/pages/${formData.get("pageId")}?error=${msg}`);
  }
  redirect(`/admin/pages/${formData.get("pageId")}?saved=1`);
}

async function upsertBlock(formData: FormData): Promise<void> {
  "use server";
  const pageId = String(formData.get("pageId") ?? "");
  const res = await upsertBlockAction(formData);
  if (res && typeof res === "object" && "ok" in res && (res as any).ok === false) {
    const msg = encodeURIComponent(String((res as any).message ?? "Erreur"));
    redirect(`/admin/pages/${pageId}?error=${msg}`);
  }
  redirect(`/admin/pages/${pageId}?saved=1`);
}

async function deleteBlock(formData: FormData): Promise<void> {
  "use server";
  const pageId = String(formData.get("pageId") ?? "");
  const res = await deleteBlockAction(formData);
  if (res && typeof res === "object" && "ok" in res && (res as any).ok === false) {
    const msg = encodeURIComponent(String((res as any).message ?? "Erreur"));
    redirect(`/admin/pages/${pageId}?error=${msg}`);
  }
  redirect(`/admin/pages/${pageId}?saved=1`);
}

export default async function AdminPageEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; edit?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const pageId = cleanText(id);
  if (!pageId) notFound();

  const saved = sp?.saved === "1";
  const errorMsg = cleanText(sp?.error);
  const editId = cleanText(sp?.edit);

  const supabase = await supabaseServerReadonly();

  const { data: page, error: pageErr } = await supabase
    .from("pages")
    .select("id,slug,title,is_published,updated_at")
    .eq("id", pageId)
    .maybeSingle<PageRow>();

  if (pageErr) {
    return (
      <section className="py-10">
        <Container>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Erreur Supabase: {pageErr.message}
          </div>
        </Container>
      </section>
    );
  }

  if (!page) {
    return (
      <section className="py-10">
        <Container>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Page introuvable.
          </div>
        </Container>
      </section>
    );
  }

  const { data: blocks, error: blocksErr } = await supabase
    .from("content_blocks")
    .select("id,page_id,key,type,value,order_index,updated_at")
    .eq("page_id", pageId)
    .order("order_index", { ascending: true })
    .order("key", { ascending: true });

  if (blocksErr) {
    return (
      <section className="py-10">
        <Container>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Erreur Supabase (content_blocks): {blocksErr.message}
          </div>
        </Container>
      </section>
    );
  }

  const items = (blocks ?? []) as BlockRow[];
  const editBlock = editId ? items.find((b) => b.id === editId) : undefined;

  const publicUrl = `/${page.slug}`;

  return (
    <section className="py-10 bg-slate-50/50">
      <Container>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Admin • Pages & Navbar</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                {page.title}
              </h1>
              {page.is_published ? (
                <Badge tone="green">Publié</Badge>
              ) : (
                <Badge tone="slate">Brouillon</Badge>
              )}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              URL publique : <span className="font-mono">{publicUrl}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/pages"
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              ← Retour
            </Link>

            <Link
              href={publicUrl}
              className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Voir la page →
            </Link>
          </div>
        </div>

        {errorMsg ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {errorMsg}
          </div>
        ) : null}

        {saved ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
            Modifications enregistrées ✅
          </div>
        ) : null}

        {/* ---------------- Page settings ---------------- */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Paramètres de la page</h2>

          <form
            action={updatePage}
            className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          >
            <input type="hidden" name="pageId" value={page.id} />

            <div>
              <FieldLabel>Titre</FieldLabel>
              <Input name="title" defaultValue={page.title} placeholder="Ex: Références" />
            </div>

            <div>
              <FieldLabel>Slug</FieldLabel>
              <Input
                name="slug"
                defaultValue={page.slug}
                placeholder="Ex: references, notre-equipe"
              />
              <div className="mt-1 text-xs text-slate-500">
                Exemple : references, notre-equipe
              </div>
            </div>

            <div className="flex items-center gap-4 md:justify-end">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                <input type="checkbox" name="is_published" defaultChecked={page.is_published} />
                Publié
              </label>

              <button
                type="submit"
                className="inline-flex items-center rounded-2xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-90"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>

        {/* ---------------- Content blocks ---------------- */}
        <div className="mt-8">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-slate-900">Content blocks</h2>
            <p className="mt-1 text-sm text-slate-600">
              Unique par <span className="font-mono">page_id + key</span>. Le champ{" "}
              <span className="font-mono">value</span> est en JSON.
            </p>
          </div>

          {/* Form add/update */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">Ajouter / Mettre à jour un bloc</div>
                {editBlock ? (
                  <div className="mt-1 text-xs text-slate-500">
                    Mode édition : <span className="font-mono">{editBlock.key}</span>{" "}
                    <span className="text-slate-400">({editBlock.id})</span>
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-slate-500">Mode création</div>
                )}
              </div>

              <Link
                href={`/admin/pages/${pageId}`}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
              >
                Nouveau bloc
              </Link>
            </div>

            <form action={upsertBlock} className="mt-5 grid gap-4">
              <input type="hidden" name="pageId" value={page.id} />
              <input type="hidden" name="slug" value={page.slug} />
              {/* si présent => update par id, sinon upsert par (pageId+key) */}
              <input type="hidden" name="blockId" value={editBlock?.id ?? ""} />

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <FieldLabel>key</FieldLabel>
                  <Input
                    name="key"
                    defaultValue={editBlock?.key ?? ""}
                    placeholder="ex: references.items"
                    required
                  />
                </div>

                <div>
                  <FieldLabel>type</FieldLabel>
                  <Select name="type" defaultValue={editBlock?.type ?? "json"}>
                    <option value="text">text</option>
                    <option value="richtext">richtext</option>
                    <option value="list">list</option>
                    <option value="json">json</option>
                  </Select>
                </div>

                <div>
                  <FieldLabel>order_index</FieldLabel>
                  <Input
                    name="order_index"
                    type="number"
                    defaultValue={String(editBlock?.order_index ?? 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <FieldLabel>value (JSON)</FieldLabel>
                <Textarea
                  name="value"
                  rows={8}
                  defaultValue={
                    editBlock ? safeJsonStringify(editBlock.value) : '{\n  "text": "Bonjour"\n}'
                  }
                  placeholder={`{\n  "text": "Bonjour"\n}`}
                  required
                />
                <div className="mt-2 text-xs text-slate-500">
                  Astuce : si tu veux une liste, mets par ex.{" "}
                  <span className="font-mono">{`{ "items": ["a", "b"] }`}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Enregistrer le bloc
                </button>
              </div>
            </form>
          </div>

          {/* List blocks */}
          <div className="mt-6 grid gap-4">
            {items.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
                Aucun bloc pour cette page.
              </div>
            ) : (
              items.map((b) => (
                <div key={b.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">
                        <span className="font-mono">{b.key}</span>
                        <span className="text-slate-400"> • </span>
                        <span className="text-slate-700">{b.type}</span>
                        <span className="text-slate-400"> • </span>
                        <span className="text-slate-600">order {b.order_index}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 font-mono">id: {b.id}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/pages/${pageId}?edit=${b.id}`}
                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        Modifier
                      </Link>

                      <form action={deleteBlock}>
                        <input type="hidden" name="pageId" value={page.id} />
                        <input type="hidden" name="slug" value={page.slug} />
                        <input type="hidden" name="blockId" value={b.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
                        >
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer select-none text-sm font-semibold text-slate-800">
                      Voir value (JSON)
                    </summary>
                    <pre className="mt-3 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
                      {safeJsonStringify(b.value)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}