import { createContext, useContext, type ReactNode } from "react";

import {
  useUpdateCheck,
  type UpdateInfo,
} from "@/hooks/useUpdateCheck";

type UpdateCheckContextValue = {
  updateInfo: UpdateInfo | null;
  dismiss: () => void;
  check: () => Promise<void>;
};

const UpdateCheckContext = createContext<UpdateCheckContextValue | null>(null);

export function UpdateCheckProvider({ children }: { children: ReactNode }) {
  const value = useUpdateCheck();
  return (
    <UpdateCheckContext.Provider value={value}>
      {children}
    </UpdateCheckContext.Provider>
  );
}

export function useUpdateCheckContext(): UpdateCheckContextValue {
  const ctx = useContext(UpdateCheckContext);
  if (!ctx) {
    return {
      updateInfo: null,
      dismiss: () => { },
      check: async () => { },
    };
  }
  return ctx;
}
