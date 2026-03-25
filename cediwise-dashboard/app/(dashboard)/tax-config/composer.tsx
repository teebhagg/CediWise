"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createTaxConfig,
  updateTaxConfig,
  type ConfigStatus,
  type PAYEBracket,
  type TaxConfigRow,
} from "@/lib/actions/tax-config";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function TaxConfigComposer({
  onComplete,
  initialData
}: {
  onComplete?: () => void;
  initialData?: TaxConfigRow;
}) {
  const router = useRouter();
  const [country, setCountry] = useState(initialData?.country ?? "ghana");
  const [currency, setCurrency] = useState(initialData?.currency ?? "GHS");
  const [year, setYear] = useState(initialData?.year ?? new Date().getFullYear() + 1);
  const [bracketPeriod, setBracketPeriod] = useState(initialData?.bracket_period ?? "monthly");
  const [status, setStatus] = useState<ConfigStatus>(initialData?.status ?? "draft");

  // SSNIT / Social Security
  const [employeeSsnitRate, setEmployeeSsnitRate] = useState(initialData?.employee_ssnit_rate ?? 0.055);
  const [employerSsnitRate, setEmployerSsnitRate] = useState(initialData?.employer_ssnit_rate ?? 0.13);
  const [employerTier2Rate, setEmployerTier2Rate] = useState(initialData?.employer_tier2_rate ?? 0.025);
  const [ssnitMonthlyCap, setSsnitMonthlyCap] = useState(initialData?.ssnit_monthly_cap ?? 69000);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brackets, setBrackets] = useState<PAYEBracket[]>(initialData?.paye_brackets ?? [
    { band_width: 490, rate: 0 },
    { band_width: 110, rate: 0.05 },
    { band_width: 130, rate: 0.1 },
    { band_width: 3166.67, rate: 0.175 },
    { band_width: 16000, rate: 0.25 },
    { band_width: 30520, rate: 0.3 },
    { band_width: null, rate: 0.35 },
  ]);

  const addBracket = () => {
    const newBrackets = [...brackets];
    newBrackets.splice(newBrackets.length - 1, 0, {
      band_width: 1000,
      rate: 0.25,
    });
    setBrackets(newBrackets);
  };

  const removeBracket = (index: number) => {
    if (brackets.length <= 1) return;
    setBrackets(brackets.filter((_, i) => i !== index));
  };

  const updateBracket = (index: number, patch: Partial<PAYEBracket>) => {
    setBrackets(
      brackets.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      country,
      currency,
      year,
      status,
      bracket_period: bracketPeriod,
      employee_ssnit_rate: employeeSsnitRate,
      employer_ssnit_rate: employerSsnitRate,
      employer_tier2_rate: employerTier2Rate,
      ssnit_monthly_cap: ssnitMonthlyCap,
      paye_brackets: brackets,
    };

    const result = initialData
      ? await updateTaxConfig(initialData.id, payload)
      : await createTaxConfig(payload);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
      if (!initialData) setYear(year + 1);
      alert(initialData ? "Tax configuration updated!" : "Tax configuration created successfully!");
      onComplete?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-10">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Country, Currency, Year */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field>
          <FieldLabel>Country</FieldLabel>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel>Currency</FieldLabel>
          <Input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel>Year</FieldLabel>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            required
          />
        </Field>
      </div>

      {/* SSNIT / Social Security */}
      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          SSNIT / Social Security
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <FieldLabel>Employee SSNIT Rate</FieldLabel>
            <Input
              type="number"
              step="0.001"
              value={employeeSsnitRate}
              onChange={(e) => setEmployeeSsnitRate(parseFloat(e.target.value))}
              required
            />
          </Field>
          <Field>
            <FieldLabel>Employer SSNIT Rate</FieldLabel>
            <Input
              type="number"
              step="0.001"
              value={employerSsnitRate}
              onChange={(e) => setEmployerSsnitRate(parseFloat(e.target.value))}
              required
            />
          </Field>
          <Field>
            <FieldLabel>Employer Tier 2 Rate</FieldLabel>
            <Input
              type="number"
              step="0.001"
              value={employerTier2Rate}
              onChange={(e) => setEmployerTier2Rate(parseFloat(e.target.value))}
              required
            />
          </Field>
          <Field>
            <FieldLabel>SSNIT Monthly Cap ({currency})</FieldLabel>
            <Input
              type="number"
              step="1"
              value={ssnitMonthlyCap}
              onChange={(e) => setSsnitMonthlyCap(parseFloat(e.target.value))}
              required
            />
          </Field>
        </div>
      </div>

      {/* PAYE Brackets */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            PAYE Progressive Brackets ({bracketPeriod})
          </h3>
          <div className="flex gap-2">
            <select
              value={bracketPeriod}
              onChange={(e) => setBracketPeriod(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBracket}
            >
              <HugeiconsIcon icon={Add01Icon} className="mr-1 size-4" />
              Add tier
            </Button>
          </div>
        </div>

        {brackets.map((bracket, index) => (
          <div
            key={index}
            className="flex items-end gap-3 rounded-lg border bg-muted/30 p-3"
          >
            <Field className="flex-1">
              <FieldLabel>
                Band Width{bracket.band_width === null ? " (∞ remainder)" : ""}
              </FieldLabel>
              <Input
                type={bracket.band_width === null ? "text" : "number"}
                step="0.01"
                disabled={bracket.band_width === null}
                value={
                  bracket.band_width === null ? "∞ (remainder)" : bracket.band_width
                }
                onChange={(e) =>
                  updateBracket(index, {
                    band_width:
                      e.target.value === ""
                        ? null
                        : parseFloat(e.target.value),
                  })
                }
              />
            </Field>
            <Field className="flex-1">
              <FieldLabel>Rate (0 to 1)</FieldLabel>
              <Input
                type="number"
                step="0.005"
                value={bracket.rate}
                onChange={(e) =>
                  updateBracket(index, { rate: parseFloat(e.target.value) })
                }
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive mb-1"
              disabled={brackets.length <= 1}
              onClick={() => removeBracket(index)}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center gap-4 border-t pt-4">
        <FieldLabel className="text-sm">Initial Status:</FieldLabel>
        <div className="flex gap-2">
          {(["draft", "active"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setStatus(opt)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                status === opt
                  ? opt === "active"
                    ? "bg-emerald-500 text-white"
                    : "bg-primary text-primary-foreground"
                  : "border bg-background hover:bg-muted"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {status === "active" && (
          <p className="text-xs text-amber-600">
            ⚠ This will supersede the current active config.
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating..." : "Create Tax Configuration"}
      </Button>
    </form>
  );
}
