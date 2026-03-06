"use client";

import { useFormStatus } from "react-dom";

export default function SubmitUploadButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Upload en cours..." : "Uploader & Ajouter à la Home"}
    </button>
  );
}