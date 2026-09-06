import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Building2,
  Boxes,
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
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/reports", label: "Reports", icon: FileSpreadsheet },
  { href: "/archives", label: "Archives", icon: Archive },
  { href: "/help", label: "Help Desk", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];
