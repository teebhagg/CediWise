"use client";

import { Pagination } from "@/components/ui/pagination";
import type { TbillRateRow } from "@/lib/actions/tbill-rates";
import { useRouter, useSearchParams } from "next/navigation";

interface TbillRatesTableProps {
  rates: TbillRateRow[];
  total: number;
  page: number;
  perPage: number;
}

export function TbillRatesTable({ rates, total, page, perPage }: TbillRatesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onPageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/learning-data/tbill-rates?${params.toString()}`);
  }
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-10 px-4 text-left font-medium">Tenor</th>
              <th className="h-10 px-4 text-left font-medium">Rate (%)</th>
              <th className="h-10 px-4 text-left font-medium">Fetched at</th>
              <th className="h-10 px-4 text-left font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-24 px-4 text-center text-muted-foreground">
                  No T-Bill rates yet.
                </td>
              </tr>
            ) : (
              rates.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">{r.tenor}</td>
                  <td className="px-4 py-3">{r.rate}%</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.fetched_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.source_snapshot_id ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
