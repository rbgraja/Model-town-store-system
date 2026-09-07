import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date");

const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time")
  .default("00:00");

export const departmentFormSchema = z.object({
  name: z.string().trim().min(1, "Department name is required").max(120),
});

export const departmentUpdateSchema = departmentFormSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

// Optional-uuid helper: an empty string from a <select> means "no category".
const optionalUuid = z
  .union([z.string().uuid(), z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const colorHex = z
  .string()
  .trim()
  .regex(/^[0-9A-Fa-f]{6}$/, "Color must be 6 hex characters, no #");

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(120),
  color_hex: colorHex.default("E5E7EB"),
  sort_order: z.coerce.number().int().min(0).max(9999).default(100),
});

export const categoryUpdateSchema = categoryFormSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  unit: z.string().trim().min(1, "Unit is required").max(40),
  category_id: optionalUuid,
});

export const productUpdateSchema = productFormSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

export const incomingEntrySchema = z.object({
  productName: z.string().trim().min(1, "Product name is required").max(200),
  unit: z.string().trim().min(1, "Unit is required").max(40),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  totalPrice: z.coerce.number().nonnegative("Total price cannot be negative"),
  unitPrice: z.coerce.number().nonnegative("Unit price is invalid"),
  entryDate: dateString,
  entryTime: timeString,
  receiptUrl: z.string().url().optional().nullable(),
  receiptPath: z.string().optional().nullable(),
});

export const incomingUpdateSchema = incomingEntrySchema
  .omit({ productName: true, unit: true })
  .extend({
    id: z.string().uuid(),
  });

export const outgoingEntrySchema = z.object({
  productId: z.string().uuid("Select a product"),
  departmentId: z.string().uuid("Select a department"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  entryDate: dateString,
  entryTime: timeString,
  notes: z.string().trim().max(500).optional().nullable(),
  allowOverride: z.coerce.boolean().default(false),
});

export const incomingWithOutgoingSchema = incomingEntrySchema.extend({
  departmentId: z.string().uuid("Select a department"),
  outgoingQuantity: z.coerce.number().positive("Outgoing quantity must be greater than 0"),
}).refine((v) => v.outgoingQuantity <= v.quantity, {
  message: "Outgoing quantity cannot be greater than the incoming quantity",
  path: ["outgoingQuantity"],
});

export const bulkOutgoingItemSchema = z.object({
  productId: z.string().uuid("Select a product"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
});

export const bulkOutgoingEntrySchema = z.object({
  departmentId: z.string().uuid("Select a department"),
  entryDate: dateString,
  entryTime: timeString,
  notes: z.string().trim().max(500).optional().nullable(),
  allowOverride: z.coerce.boolean().default(false),
  items: z.array(bulkOutgoingItemSchema).min(1, "Add at least one product"),
});

export const voidReasonSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(1, "A reason is required").max(500),
});

export const monthlyReportSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const customReportSchema = z
  .object({
    from: dateString,
    to: dateString,
  })
  .refine((v) => new Date(v.from) <= new Date(v.to), {
    message: "Start date must be before end date",
    path: ["to"],
  });

export const archiveYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export type IncomingEntryInput = z.infer<typeof incomingEntrySchema>;
export type OutgoingEntryInput = z.infer<typeof outgoingEntrySchema>;
