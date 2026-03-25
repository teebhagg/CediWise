"use client";

import { create } from "zustand";
import { type TaxConfigRow } from "@/lib/actions/tax-config";

export type TaxUIState = "none" | "create" | "view" | "edit";

interface TaxStore {
  mode: TaxUIState;
  selectedConfig: TaxConfigRow | null;
  setMode: (mode: TaxUIState) => void;
  openCreate: () => void;
  openEdit: (config: TaxConfigRow) => void;
  openView: (config: TaxConfigRow) => void;
  close: () => void;
}

export const useTaxStore = create<TaxStore>((set) => ({
  mode: "none",
  selectedConfig: null,
  setMode: (mode) => set({ mode }),
  openCreate: () => set({ mode: "create", selectedConfig: null }),
  openEdit: (config) => set({ mode: "edit", selectedConfig: config }),
  openView: (config) => set({ mode: "view", selectedConfig: config }),
  close: () => set({ mode: "none", selectedConfig: null }),
}));
