"use client";
/**
 * "Shows I've seen": a list of AniList ids saved in this browser (localStorage).
 * Results hide shows you've marked as seen, so you only get new picks.
 *
 * Nothing is sent to our server; the list lives only on this device.
 * useSyncExternalStore keeps every card and list in sync when one changes,
 * including across browser tabs.
 */
import { useSyncExternalStore } from "react";

const KEY = "seen:v1";
const MAX = 2000; // plenty for anyone, and keeps storage small
const listeners = new Set<() => void>();
const EMPTY: ReadonlySet<number> = new Set();

let cache: ReadonlySet<number> | null = null;

function read(): ReadonlySet<number> {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = new Set(Array.isArray(raw) ? raw.filter((n) => Number.isInteger(n)) : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

function write(next: Set<number>) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify([...next].slice(-MAX)));
  } catch {
    /* private mode or storage full: still works for this visit */
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) { cache = null; onChange(); }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The set of AniList ids this visitor has marked as seen. Empty during server rendering. */
export function useSeen(): ReadonlySet<number> {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Mark or unmark a show as seen. Returns true if it is now marked as seen. */
export function toggleSeen(id: number): boolean {
  const next = new Set(read());
  const nowSeen = !next.delete(id);
  if (nowSeen) next.add(id);
  write(next);
  return nowSeen;
}
