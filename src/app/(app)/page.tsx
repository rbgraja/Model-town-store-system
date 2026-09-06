import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  FileSpreadsheet,
  Boxes,
  Package,
  Wallet,
  TrendingDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatQuantity, monthName } from "@/lib/utils";
import type { DashboardSummaryRow } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_dashboard_summary");
  const summary = (data as DashboardSummaryRow[] | null)?.[0];

  const now = new Date();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of store inventory across all departments.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Products"
          value={String(summary?.total_products ?? 0)}
          icon={Package}
        />
        <StatCard
          label="Total Incoming Qty"
          value={formatQuantity(summary?.total_incoming_qty)}
          icon={ArrowDownToLine}
          tone="positive"
        />
        <StatCard
          label="Total Outgoing Qty"
          value={formatQuantity(summary?.total_outgoing_qty)}
          icon={ArrowUpFromLine}
          tone="negative"
        />
        <StatCard
          label="Current Stock"
          value={formatQuantity(summary?.current_stock_qty)}
          sub={formatCurrency(summary?.current_stock_value) + " value"}
          icon={Boxes}
        />
        <StatCard
          label="Total Incoming Expense"
          value={formatCurrency(summary?.total_incoming_expense)}
          icon={Wallet}
        />
        <StatCard
          label="Total Outgoing Expense"
          value={formatCurrency(summary?.total_outgoing_expense)}
          icon={TrendingDown}
        />
      </div>

      <Card>
        <CardHeader
          title={`${monthName(now.getMonth() + 1)} ${now.getFullYear()} Summary`}
          description="Activity so far this month"
        />
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Incoming Entries</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {summary?.month_incoming_entries ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Outgoing Entries</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {summary?.month_outgoing_entries ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Incoming Expense</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(summary?.month_incoming_expense)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Outgoing Expense</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(summary?.month_outgoing_expense)}
            </p>
          </div>
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction href="/incoming/new" icon={ArrowDownToLine} label="Add Incoming" />
          <QuickAction href="/outgoing/new" icon={ArrowUpFromLine} label="Add Outgoing" />
          <QuickAction href="/departments" icon={Building2} label="Manage Departments" />
          <QuickAction href="/reports" icon={FileSpreadsheet} label="Generate Monthly Report" />
          <QuickAction href="/reports" icon={FileSpreadsheet} label="Generate Custom Report" />
          <QuickAction href="/stock" icon={Boxes} label="View Stock" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof ArrowDownToLine;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
    >
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium text-gray-900">{label}</span>
    </Link>
  );
}
