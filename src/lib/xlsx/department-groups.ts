/**
 * The monthly report is delivered as five files: one each for the three big
 * departments, one for every other department, and the all-in total.
 * Matching is by normalised name (case and repeated spaces ignored) so
 * "GROCERY  STORE" matches however it is typed.
 */
export type ReportScope = "total" | "kitchen" | "grocery" | "bakery" | "others";

export const REPORT_SCOPES: { key: ReportScope; label: string; fileSuffix: string }[] = [
  { key: "kitchen", label: "Kitchen", fileSuffix: "Kitchen" },
  { key: "grocery", label: "Grocery Store", fileSuffix: "Grocery_Store" },
  { key: "bakery", label: "Bakery", fileSuffix: "Bakery" },
  { key: "others", label: "Other Departments", fileSuffix: "Other_Departments" },
  { key: "total", label: "Total (All Departments)", fileSuffix: "TOTAL" },
];

const NAMED: Record<"kitchen" | "grocery" | "bakery", string> = {
  kitchen: "kitchen",
  grocery: "grocery store",
  bakery: "bakery",
};

export function normalizeDepartmentName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Does a department belong to the given (non-total) scope? */
export function departmentInScope(departmentName: string, scope: ReportScope): boolean {
  if (scope === "total") return true;
  const n = normalizeDepartmentName(departmentName);
  const namedKeys = Object.values(NAMED);
  if (scope === "others") return !namedKeys.includes(n);
  return n === NAMED[scope];
}

export function isReportScope(v: string | null): v is ReportScope | "zip" {
  return v === "zip" || REPORT_SCOPES.some((s) => s.key === v);
}
