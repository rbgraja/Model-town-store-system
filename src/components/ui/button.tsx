import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50",
  secondary:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50",
  ghost: "text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50",
};

// Larger touch targets on mobile (min 40-44px height), still compact on desktop.
const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-2 text-xs min-h-[36px] md:px-2.5 md:py-1.5 md:min-h-0",
  md: "px-4 py-2.5 text-sm min-h-[44px] md:px-3.5 md:py-2 md:min-h-0",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium shadow-sm transition-colors touch-manipulation",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}
