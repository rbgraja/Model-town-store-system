import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Tag,
  Building2,
  Boxes,
  CalendarDays,
  FileSpreadsheet,
  Archive,
  Settings,
  HelpCircle,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incoming", label: "Incoming", icon: ArrowDownToLine },
  { href: "/outgoing", label: "Outgoing", icon: ArrowUpFromLine },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/product-calendar", label: "Product Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: FileSpreadsheet },
  { href: "/archives", label: "Archives", icon: Archive },
  { href: "/help", label: "Help Desk", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];
