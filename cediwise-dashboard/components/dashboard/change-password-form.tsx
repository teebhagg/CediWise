"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (err) {
      if (err.message?.toLowerCase().includes("recent sign in") || err.message?.toLowerCase().includes("reauthenticate")) {
        setError("For security, please sign out and sign back in, then try again.");
      } else {
        setError(err.message ?? "Failed to update password.");
      }
      return;
    }

    setSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={loading}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={loading}
          />
        </Field>
      </FieldGroup>
      {error && <FieldError>{error}</FieldError>}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-500">
          Password updated successfully.
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
