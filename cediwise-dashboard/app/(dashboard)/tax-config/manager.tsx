"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTaxStore } from "./store";
import { TaxConfigComposer } from "./composer";
import { TaxConfigViewer } from "./viewer";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function TaxManager() {
  const { mode, selectedConfig, openCreate, close } = useTaxStore();

  return (
    <>
      <Button onClick={openCreate} className="gap-2">
        <HugeiconsIcon icon={Add01Icon} className="size-4" />
        Create tax year
      </Button>

      <Sheet open={mode !== "none"} onOpenChange={(open) => !open && close()}>
        <SheetContent className="sm:max-w-xl  overflow-y-auto w-full md:w-[1000px] p-4 md:p-6">
          <SheetHeader className="mb-6">
            <SheetTitle>
              {mode === "create" ? "New Tax Configuration" : mode === "edit" ? "Edit Tax Configuration" : "View Tax Details"}
            </SheetTitle>
            <SheetDescription>
              {mode === "create" ? "Define new SSNIT and PAYE rates." : mode === "edit" ? "Updating rates for an existing record." : "Full details for the selected tax configuration."}
            </SheetDescription>
          </SheetHeader>
          
          {mode === "view" && selectedConfig && <TaxConfigViewer config={selectedConfig} />}
          {(mode === "create" || (mode === "edit" && selectedConfig)) && (
            <TaxConfigComposer onComplete={close} initialData={selectedConfig || undefined} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
