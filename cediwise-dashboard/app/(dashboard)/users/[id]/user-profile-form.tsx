"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/lib/actions/users";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UserProfileFormProps {
  userId: string;
  initialData: {
    paydayDay: number | null;
    setupCompleted: boolean;
    stableSalary: number;
    rent: number;
  };
}

export function UserProfileForm({ userId, initialData }: UserProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paydayDay, setPaydayDay] = useState(
    initialData.paydayDay?.toString() ?? ""
  );
  const [setupCompleted, setSetupCompleted] = useState(initialData.setupCompleted);
  const [stableSalary, setStableSalary] = useState(
    initialData.stableSalary.toString()
  );
  const [rent, setRent] = useState(initialData.rent.toString());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const pd = paydayDay.trim() ? parseInt(paydayDay, 10) : null;
    if (pd !== null && (isNaN(pd) || pd < 1 || pd > 31)) {
      setError("Payday day must be 1–31");
      setLoading(false);
      return;
    }

    const salary = parseFloat(stableSalary);
    const rentNum = parseFloat(rent);
    if (isNaN(salary) || salary < 0) {
      setError("Salary must be a non-negative number");
      setLoading(false);
      return;
    }
    if (isNaN(rentNum) || rentNum < 0) {
      setError("Rent must be a non-negative number");
      setLoading(false);
      return;
    }

    const result = await updateProfile(userId, {
      paydayDay: pd,
      setupCompleted,
      stableSalary: salary,
      rent: rentNum,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="payday">Payday day (1–31)</FieldLabel>
          <Input
            id="payday"
            type="number"
            min={1}
            max={31}
            placeholder="e.g. 25"
            value={paydayDay}
            onChange={(e) => setPaydayDay(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="salary">Stable salary (GHS)</FieldLabel>
          <Input
            id="salary"
            type="number"
            min={0}
            step={0.01}
            placeholder="0"
            value={stableSalary}
            onChange={(e) => setStableSalary(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="rent">Rent (GHS)</FieldLabel>
          <Input
            id="rent"
            type="number"
            min={0}
            step={0.01}
            placeholder="0"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
          />
        </Field>
        <Field orientation="horizontal">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={setupCompleted}
              onChange={(e) => setSetupCompleted(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm font-medium">Setup completed</span>
          </label>
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
