"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await changePassword(formData);
      if (result.ok) {
        toast.success("Password updated");
        setPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader title="Change Password" description="Update the operator sign-in password." />
      <CardBody>
        <form action={submit} className="max-w-sm space-y-4">
          <Field label="New Password" htmlFor="password">
            <TextInput
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          <Field label="Confirm Password" htmlFor="confirmPassword">
            <TextInput
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
