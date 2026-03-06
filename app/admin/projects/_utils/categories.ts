// app/admin/projects/_utils/categories.ts
export const PROJECT_CATEGORIES = [
  "Projets industriels",
  "Construction urbaine",
  "Location d’engins",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export function isProjectCategory(v: unknown): v is ProjectCategory {
  return typeof v === "string" && (PROJECT_CATEGORIES as readonly string[]).includes(v);
}
