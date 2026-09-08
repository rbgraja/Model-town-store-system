/**
 * There is no per-product reorder-point column anywhere in the schema (see
 * `supabase/migrations/*.sql` — `products`/`incoming_batches` carry no
 * threshold field). "Low stock" is a simple fixed-quantity heuristic so the
 * Outgoing filters have three real buckets instead of just in/out of stock.
 * Adjust this single constant if 10 units isn't the right cutoff.
 */
export const LOW_STOCK_THRESHOLD = 10;

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getStockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};
