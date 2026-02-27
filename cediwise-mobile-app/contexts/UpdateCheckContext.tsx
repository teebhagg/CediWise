import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import React, { ReactNode, createContext, useContext } from "react";

type UpdateCheckContextValue = {
  /** Manually trigger an update check */
  check: () => void;
};

const UpdateCheckContext = createContext<UpdateCheckContextValue | undefined>(
  undefined,
);

export function UpdateCheckProvider({ children }: { children: ReactNode }) {
  const { check } = useUpdateCheck();
  return (
    <UpdateCheckContext.Provider value={{ check }}>
      {children}
    </UpdateCheckContext.Provider>
  );
}

export function useUpdateCheckContext(): UpdateCheckContextValue {
  const ctx = useContext(UpdateCheckContext);
  if (!ctx) {
    throw new Error(
      "useUpdateCheckContext must be used within UpdateCheckProvider",
    );
  }
  return ctx;
}
