import { useEffect, useState } from "react";
import { getCategories } from "../data/api";
import type { Category } from "../types/pins";

export function useCategories(): Category[] {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;

    getCategories().then((result) => {
      if (!cancelled) setCategories(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}
