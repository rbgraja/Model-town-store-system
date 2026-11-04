/**
 * The monthly report is delivered as three files: Kitchen + Grocery Store +
 * Bakery together, every other department together, and the all-in total.
 * Matching is by normalised name (case and repeated spaces ignored) so
 * "GROCERY  STORE" matches however it is typed.
 */
export type ReportScope = "main" | "others" | "total";

export const REPORT_SCOPES: { key: ReportScope; label: string; fileSuffix: string }[] = [
  { key: "main", label: "Kitchen, Grocery Store & Bakery", fileSuffix: "Kitchen_Grocery_Bakery" },
  { key: "others", label: "Other Departments", fileSuffix: "Other_Departments" },
  { key: "total", label: "Total (All Departments)", fileSuffix: "TOTAL" },
];

const MAIN_DEPARTMENTS = ["kitchen", "grocery store", "bakery"];

export function normalizeDepartmentName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Does a department belong to the given scope? */
export function departmentInScope(departmentName: string, scope: ReportScope): boolean {
  if (scope === "total") return true;
  const isMain = MAIN_DEPARTMENTS.includes(normalizeDepartmentName(departmentName));
  return scope === "main" ? isMain : !isMain;
}

export function isReportScope(v: string | null): v is ReportScope | "zip" {
  return v === "zip" || REPORT_SCOPES.some((s) => s.key === v);
}
