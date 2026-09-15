import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

type DrawerContextValue = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

/**
 * Whether the drawer is open lives here instead of inside <Drawer> because a
 * map pin needs to read it too: clicking a pin plots a route while the
 * drawer's open (the existing "locate" behaviour), but opens that pin's
 * details view when the drawer's closed.
 */
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <DrawerContext.Provider value={{ open, setOpen }}>{children}</DrawerContext.Provider>;
}

export function useDrawer(): DrawerContextValue {
  const context = useContext(DrawerContext);
  if (!context) throw new Error("useDrawer must be used within a DrawerProvider");
  return context;
}
