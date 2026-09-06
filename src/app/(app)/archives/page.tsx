import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ArchiveYearForm } from "./archive-year-form";
import type { YearlyArchive } from "@/lib/types/database";

export default async function ArchivesPage() {
  const supabase = await createClient();
  const { data: archives } = await supabase
    .from("yearly_archives")
    .select("*")
    .order("year", { ascending: false });

  const archivedYears = new Set((archives as YearlyArchive[] | null)?.map((a) => a.year));
  const currentYear = new Date().getFullYear();
  const eligibleYears = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i).filter(
    (y) => !archivedYears.has(y)
  );

  return (
    <div>
      <PageHeader
        title="Archives"
        description="Yearly XLSX archives of fully-consumed inventory history."
      />
      <div className="space-y-6">
        <ArchiveYearForm eligibleYears={eligibleYears} />

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="table-scroll">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Archive File</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Incoming Archived</th>
                  <th className="px-4 py-3 text-right">Outgoing Archived</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {((archives as YearlyArchive[]) ?? []).map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.year}</td>
                    <td className="px-4 py-3">{a.file_name}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={a.status === "completed" ? "green" : "amber"}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{a.entries_archived_incoming}</td>
                    <td className="px-4 py-3 text-right">{a.entries_archived_outgoing}</td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/files/view?path=${encodeURIComponent(a.file_path)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    </td>
                  </tr>
                ))}
                {(!archives || archives.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                      No years archived yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
