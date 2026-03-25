"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  activateTaxConfig,
  deleteTaxConfig,
  type TaxConfigRow,
} from "@/lib/actions/tax-config";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTaxStore } from "./store";
import { 
  CheckmarkCircle01Icon, 
  Delete02Icon, 
  ViewIcon, 
  PencilEdit01Icon,
  InformationCircleIcon 
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>;
    case "draft":
      return <Badge variant="outline" className="border-amber-500/50 text-amber-600">Draft</Badge>;
    case "superseded":
      return <Badge variant="outline" className="text-muted-foreground">Superseded</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function TaxConfigsTable({ data, total }: { data: TaxConfigRow[]; total: number }) {
  const router = useRouter();
  const { openView, openEdit } = useTaxStore();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleActivate(id: string, country: string) {
    setLoading(id);
    const result = await activateTaxConfig(id, country);
    setLoading(null);
    if (result.error) alert(result.error);
    else router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this config?")) return;
    setLoading(id);
    const result = await deleteTaxConfig(id);
    setLoading(null);
    if (result.error) alert(result.error);
    else router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 font-medium">Year</th>
            <th className="px-4 py-3 font-medium">Country</th>
            <th className="px-4 py-3 font-medium text-center">Status</th>
            <th className="px-4 py-3 font-medium">Calculation Summary</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-muted/20 transition-colors group">
              <td className="px-4 py-4 font-bold text-base">{row.year}</td>
              <td className="px-4 py-4">
                <div className="flex flex-col">
                  <span className="capitalize font-medium">{row.country}</span>
                  <span className="text-xs text-muted-foreground uppercase">{row.currency} • {row.bracket_period}</span>
                </div>
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-4 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">SSNIT</span>
                    <span className="font-semibold">{(row.employee_ssnit_rate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Tiers</span>
                    <span className="font-semibold">{row.paye_brackets.length} bands</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Max Cap</span>
                    <span className="font-semibold">{row.currency} {row.ssnit_monthly_cap.toLocaleString()}</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-primary/20 hover:border-primary/50 text-primary"
                    onClick={() => openView(row)}
                  >
                    <HugeiconsIcon icon={ViewIcon} className="size-4" />
                    Details
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => openEdit(row)}
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
                    Edit
                  </Button>
                  
                  {row.status !== "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!loading}
                      className="h-8 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleActivate(row.id, row.country)}
                    >
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-4" />
                      Activate
                    </Button>
                  )}
                  
                  {row.status !== "active" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!!loading}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(row.id)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
