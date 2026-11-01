"use client";
/**
 * Dark/light switch. The choice is saved in the browser (localStorage) and
 * applied by a tiny script in layout.tsx before the page paints, so there's
 * no white flash when a dark-mode user loads the page.
 *
 * The current theme lives on <html data-theme="...">. We "subscribe" to that
 * attribute with useSyncExternalStore, so the button icon always matches it.
 */
import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
const getTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
// On the server we don't know the visitor's choice yet; render the default (dark) icon.
const getServerTheme = (): Theme => "dark";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    // Keep the phone's browser bar the same color as the page.
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#f4f3fa" : "#14122b");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode: the choice just won't be remembered */
    }
  }

  const toLight = theme !== "light";
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-10 w-10 place-items-center rounded-full border border-line text-text hover:bg-surface-2"
      aria-label={toLight ? "Switch to light mode" : "Switch to dark mode"}
      title={toLight ? "Light mode" : "Dark mode"}
    >
      {toLight ? (
        // sun
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // moon
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
