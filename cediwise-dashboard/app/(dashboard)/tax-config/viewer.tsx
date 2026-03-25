"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type TaxConfigRow } from "@/lib/actions/tax-config";
import { useTaxStore } from "./store";
import { Button } from "@/components/ui/button";
import { PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function TaxConfigViewer({ config }: { config: TaxConfigRow }) {
  const { openEdit } = useTaxStore();

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold">{config.year}</span>
          <Badge className={config.status === 'active' ? 'bg-emerald-500' : ''}>
            {config.status.toUpperCase()}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => openEdit(config)} className="gap-2">
          <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
          Edit configuration
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Country</p>
          <p className="capitalize">{config.country}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Currency</p>
          <p>{config.currency}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground font-semibold">Bracket Period</p>
          <p className="capitalize">{config.bracket_period}</p>
        </div>
      </div>

      <Card className="bg-muted/30 border-none shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            SSNIT Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Employee</p>
            <p className="text-lg font-semibold">{(config.employee_ssnit_rate * 100).toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Employer</p>
            <p className="text-lg font-semibold">{(config.employer_ssnit_rate * 100).toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Employer Tier 2</p>
            <p className="text-lg font-semibold">{(config.employer_tier2_rate * 100).toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly Cap</p>
            <p className="text-lg font-semibold">{config.currency} {config.ssnit_monthly_cap.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          PAYE Progressive Brackets
        </h3>
        <div className="space-y-2">
          {config.paye_brackets.map((bracket, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Tier {i + 1}</span>
                <span className="font-medium">
                  {bracket.band_width === null 
                    ? `Over thresholds` 
                    : `Next ${config.currency} ${bracket.band_width.toLocaleString()}`}
                </span>
              </div>
              <Badge variant="secondary" className="text-sm">
                {(bracket.rate * 100).toFixed(1)}%
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
