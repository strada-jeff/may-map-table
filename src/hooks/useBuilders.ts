import { useEffect, useState } from "react";
import { getBuilders } from "../data/api";
import type { Builder } from "../types/pins";

export function useBuilders(): Builder[] {
  const [builders, setBuilders] = useState<Builder[]>([]);

  useEffect(() => {
    let cancelled = false;

    getBuilders().then((result) => {
      if (!cancelled) setBuilders(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return builders;
}
