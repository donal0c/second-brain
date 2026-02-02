import { useEffect, useState } from "react";
import { getGenerativeUIEnabled, setGenerativeUIEnabled } from "../lib/settings";

export function useGenerativeUI() {
  const [enabled, setEnabled] = useState(getGenerativeUIEnabled);

  useEffect(() => {
    setGenerativeUIEnabled(enabled);
  }, [enabled]);

  return { enabled, setEnabled };
}
