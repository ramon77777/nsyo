type Props = {
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  query: Record<string, string | undefined>;
};

function qs(query: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v && v.trim()) sp.set(k, v.trim());
  }
  return sp.toString();
}

export default function Pagination({ total, page, pageSize, basePath, query }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < pages ? page + 1 : null;

  const link = (p: number) => {
    const q = qs({ ...query, page: String(p) });
    return q ? `${basePath}?${q}` : basePath;
  };

  return (
    <div className="mt-10 flex items-center justify-between gap-4">
      <div className="text-sm text-slate-600">
        Page <span className="font-semibold">{page}</span> / {pages} —{" "}
        <span className="font-semibold">{total}</span> projet{total > 1 ? "s" : ""}
      </div>

      <div className="flex items-center gap-2">
        <a
          href={prev ? link(prev) : undefined}
          className={[
            "rounded-xl border px-4 py-2 text-sm font-semibold",
            prev
              ? "border-slate-200 bg-white hover:bg-slate-50"
              : "border-slate-100 bg-slate-50 text-slate-400 pointer-events-none",
          ].join(" ")}
        >
          ← Précédent
        </a>

        <a
          href={next ? link(next) : undefined}
          className={[
            "rounded-xl border px-4 py-2 text-sm font-semibold",
            next
              ? "border-slate-200 bg-white hover:bg-slate-50"
              : "border-slate-100 bg-slate-50 text-slate-400 pointer-events-none",
          ].join(" ")}
        >
          Suivant →
        </a>
      </div>
    </div>
  );
}
