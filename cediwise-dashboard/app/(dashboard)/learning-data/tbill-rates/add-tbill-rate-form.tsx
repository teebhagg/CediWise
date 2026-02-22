"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createTbillRate } from "@/lib/actions/tbill-rates";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddTbillRateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenor, setTenor] = useState("");
  const [rate, setRate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const rateNum = parseFloat(rate);
    if (!tenor.trim()) {
      setError("Tenor is required");
      setLoading(false);
      return;
    }
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      setError("Rate must be 0–100");
      setLoading(false);
      return;
    }
    const result = await createTbillRate(tenor.trim(), rateNum);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setTenor("");
    setRate("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      {error && (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Field>
        <FieldLabel htmlFor="tenor">Tenor</FieldLabel>
        <Input
          id="tenor"
          placeholder="91-day"
          value={tenor}
          onChange={(e) => setTenor(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="rate">Rate (%)</FieldLabel>
        <Input
          id="rate"
          type="number"
          min={0}
          max={100}
          step={0.01}
          placeholder="29.5"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add rate"}
      </Button>
    </form>
  );
}
