import { useEffect, useState } from "react";
import { getCopy } from "../data/api";
import type { Copy } from "../data/schema";

const EMPTY: Copy = { help: { heading: "", body: "" }, signup: { heading: "", qrValue: "" } };

/** Kiosk-wide copy from the CMS's Kiosk Settings page. */
export function useCopy(): Copy {
  const [copy, setCopy] = useState<Copy>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    getCopy().then((result) => {
      if (!cancelled) setCopy(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return copy;
}
