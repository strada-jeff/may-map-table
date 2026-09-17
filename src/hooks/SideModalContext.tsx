import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type SideModalKey = "signup" | "help";

type SideModalContextValue = {
  /** null means no side modal is open. */
  activeModal: SideModalKey | null;
  open: (key: SideModalKey) => void;
  close: () => void;
};

const SideModalContext = createContext<SideModalContextValue | null>(null);

export function SideModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<SideModalKey | null>(null);

  const open = useCallback((key: SideModalKey) => setActiveModal(key), []);
  const close = useCallback(() => setActiveModal(null), []);

  return (
    <SideModalContext.Provider value={{ activeModal, open, close }}>
      {children}
    </SideModalContext.Provider>
  );
}

export function useSideModal(): SideModalContextValue {
  const context = useContext(SideModalContext);
  if (!context) throw new Error("useSideModal must be used within a SideModalProvider");
  return context;
}
