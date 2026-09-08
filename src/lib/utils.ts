import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Plain "Rs. " prefix rather than Intl currency formatting with "PKR" — ICU's
// PKR symbol support is inconsistent across browsers/Node (some render "₨",
// others fall back to "PKR"), and this matches the xlsx reports exactly
// (see RS_FORMAT in src/lib/xlsx/build-template-sheets.ts).
const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  return `Rs. ${amountFormatter.format(value ?? 0)}`;
}

export function formatQuantity(
  value: number | null | undefined,
  unit?: string
): string {
  const n = value ?? 0;
  const formatted = Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      });
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "-";
  const [h, m] = value.split(":");
  const hour = Number(h);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${period}`;
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimeString(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("en-US", {
    month: "long",
  });
}

/** Returns [firstDayISO, lastDayISO] for a given month/year, inclusive. */
export function monthRange(month: number, year: number): [string, string] {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return humanizeDbError(err.message);
  return "Something went wrong";
}

/** Turns our Postgres RAISE EXCEPTION codes into operator-friendly text. */
export function humanizeDbError(message: string): string {
  const code = message.split(":")[0]?.trim();
  const map: Record<string, string> = {
    INSUFFICIENT_STOCK:
      "Insufficient stock for this quantity. Enable override to issue anyway.",
    NO_PURCHASE_HISTORY:
      "This product has never been purchased — there is no cost basis to issue against.",
    DEPARTMENT_INACTIVE: "That department is inactive.",
    DEPARTMENT_NOT_FOUND: "Department not found.",
    PRODUCT_NOT_FOUND: "Product not found.",
    QUANTITY_MUST_BE_POSITIVE: "Quantity must be greater than 0.",
    TOTAL_PRICE_INVALID: "Total price cannot be negative.",
    UNIT_PRICE_INVALID: "Unit price is invalid.",
    DATE_REQUIRED: "Date is required.",
    PRODUCT_NAME_REQUIRED: "Product name is required.",
    UNIT_REQUIRED: "Unit is required.",
    DEPARTMENT_NAME_REQUIRED: "Department name is required.",
    DEPARTMENT_NAME_ALREADY_EXISTS: "A department with that name already exists.",
    PRODUCT_NAME_ALREADY_EXISTS: "A product with that name already exists.",
    BATCH_NOT_FOUND: "Purchase entry not found.",
    BATCH_IS_VOID: "This purchase entry has already been voided.",
    BATCH_ALREADY_ALLOCATED: message.includes(":")
      ? message.split(":").slice(1).join(":").trim()
      : "This purchase has already been issued against and cannot be edited that way.",
    QUANTITY_BELOW_CONSUMED:
      "Quantity cannot be lower than what has already been issued from this batch.",
    OUTGOING_ENTRY_NOT_FOUND: "Outgoing entry not found.",
    ALREADY_VOID: "This entry has already been voided.",
    YEAR_ALREADY_ARCHIVED: "This year has already been archived.",
    CANNOT_ARCHIVE_CURRENT_OR_FUTURE_YEAR:
      "You can only archive a year that has fully ended.",
    INVALID_YEAR: "Invalid year.",
    OUTGOING_QUANTITY_MUST_BE_POSITIVE: "Outgoing quantity must be greater than 0.",
    OUTGOING_EXCEEDS_INCOMING: "Outgoing quantity cannot be greater than the incoming quantity.",
    ITEMS_REQUIRED: "Add at least one product before saving.",
    ITEM_PRODUCT_REQUIRED: "Every row needs a product selected.",
    ITEM_QUANTITY_MUST_BE_POSITIVE: "Every row needs a quantity greater than 0.",
  };
  return map[code ?? ""] ?? message;
}
