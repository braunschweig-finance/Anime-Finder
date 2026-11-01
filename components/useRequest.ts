"use client";
/**
 * Tracks one search request: loading, results, error.
 * If the user starts a new search before the old one finishes, the old one is
 * cancelled so its results can't overwrite the new ones.
 */
import { useCallback, useRef, useState } from "react";
import type { SearchResponse } from "@/lib/types";

export type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: SearchResponse }
  | { status: "error"; message: string };

export function useRequest() {
  const [state, setState] = useState<RequestState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  /** Start a request. Resolves with the results (or null if it failed or was replaced). */
  const run = useCallback(async (url: string, init?: RequestInit): Promise<SearchResponse | null> => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setState({ status: "loading" });
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      const body = await res.json().catch(() => null);
      if (ctrl.signal.aborted) return null;
      if (!res.ok || !body || body.error) {
        setState({ status: "error", message: body?.error ?? "Something went wrong. Try again in a moment." });
        return null;
      }
      setState({ status: "done", data: body as SearchResponse });
      return body as SearchResponse;
    } catch (err) {
      if ((err as Error).name === "AbortError") return null;
      setState({ status: "error", message: "You seem to be offline. Check your connection and try again." });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { state, run, reset };
}
