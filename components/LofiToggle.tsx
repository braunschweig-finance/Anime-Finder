"use client";
/**
 * Lo-fi music on/off. Off by default, and nothing loads until the first tap:
 * the music code (lib/lofi.ts) is fetched then, and it synthesizes the beat
 * in the browser, so there's no audio file to download.
 */
import { useEffect, useRef, useState } from "react";
import type { LofiPlayer } from "@/lib/lofi";

export function LofiToggle() {
  const [on, setOn] = useState(false);
  const player = useRef<LofiPlayer | null>(null);

  // Stop the music if the header unmounts (e.g. navigating to About).
  useEffect(() => () => player.current?.stop(), []);

  async function toggle() {
    if (player.current) {
      player.current.stop();
      player.current = null;
      setOn(false);
      return;
    }
    // Create the audio context right inside the tap: phones only allow sound that starts from a tap.
    const ctx = new AudioContext();
    void ctx.resume();
    setOn(true);
    const { startLofi } = await import("@/lib/lofi");
    player.current = startLofi(ctx);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Stop lo-fi music" : "Play lo-fi music"}
      title={on ? "Stop lo-fi music" : "Play lo-fi music"}
      className={`grid h-10 w-10 place-items-center rounded-full border hover:bg-surface-2 ${on ? "border-accent text-accent-text" : "border-line text-text"}`}
    >
      {on ? (
        // music note with sound waves
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M9 18V5l10-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
        </svg>
      ) : (
        // music note, crossed out
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M9 18V5l10-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
          <path d="M3 3l18 18" />
        </svg>
      )}
    </button>
  );
}
