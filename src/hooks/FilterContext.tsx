import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Category } from "../types/pins";
import { useRoute } from "./RouteContext";

type FilterContextValue = {
  /** null means "All" — no category filter applied. */
  activeCategoryId: Category["id"] | null;
  setActiveCategoryId: (categoryId: Category["id"] | null) => void;
};

const FilterContext = createContext<FilterContextValue | null>(null);

/**
 * Single shared category filter driving both the drawer's card list and the
 * map's destination markers, so picking a filter anywhere keeps both in
 * sync. Single-select: choosing a category clears any other selection,
 * "All" clears back to null. Must live inside a RouteProvider — changing
 * the filter clears any active route, since its destination pin may no
 * longer be visible.
 */
export function FilterProvider({ children }: { children: ReactNode }) {
  const [activeCategoryId, setActiveCategoryIdState] = useState<Category["id"] | null>(null);
  const { clearRoute } = useRoute();

  const setActiveCategoryId = useCallback(
    (categoryId: Category["id"] | null) => {
      setActiveCategoryIdState(categoryId);
      clearRoute();
    },
    [clearRoute],
  );

  const value = useMemo(() => ({ activeCategoryId, setActiveCategoryId }), [activeCategoryId, setActiveCategoryId]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter(): FilterContextValue {
  const context = useContext(FilterContext);
  if (!context) throw new Error("useFilter must be used within a FilterProvider");
  return context;
}
