"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ViewKey } from "./views";

/**
 * The active view, stored in the URL as ?view=highs (lows is the default and
 * has no parameter), so a view can be linked to and the back button works.
 *
 * Reads location directly via useSyncExternalStore rather than
 * useSearchParams, which would opt the statically prerendered page out of
 * server rendering. The server snapshot is always "lows"; React re-renders
 * with the URL's value after hydration without a mismatch.
 */
const EVENT = "viewparamchange";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

const readView = (): ViewKey =>
  new URLSearchParams(window.location.search).get("view") === "highs" ? "highs" : "lows";

export function useViewParam(): [ViewKey, (view: ViewKey) => void] {
  const view = useSyncExternalStore(subscribe, readView, () => "lows" as const);

  const setView = useCallback((next: ViewKey) => {
    const url = new URL(window.location.href);
    if (next === "lows") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [view, setView];
}
