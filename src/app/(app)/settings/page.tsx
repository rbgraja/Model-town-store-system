import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PasswordForm } from "./password-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <PageHeader title="Settings" description="Account and system information." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Account" />
          <CardBody>
            <p className="text-sm text-gray-600">
              Signed in as <span className="font-medium text-gray-900">{user?.email}</span>
            </p>
          </CardBody>
        </Card>
        <PasswordForm />
      </div>
    </div>
  );
}
