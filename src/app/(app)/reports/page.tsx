import { PageHeader } from "@/components/ui/page-header";
import { MonthlyReportForm, CustomReportForm } from "./report-forms";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate professional XLSX reports for any period."
      />
      <div className="space-y-6">
        <MonthlyReportForm />
        <CustomReportForm />
      </div>
    </div>
  );
}
