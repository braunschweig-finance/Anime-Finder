"use client";
/**
 * The headline with its rotating blank: "What anime should I watch if I like ___?"
 *
 * The rotating title always sits on its own line, and if a title is too wide
 * for that line it is scaled down to fit. So the headline never gains a line
 * and the page below it never jumps when the word changes.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Words that cycle through the headline blank. */
const BLANKS = ["Frieren", "One Piece", "Fire Force", "Jujutsu Kaisen", "sad elves", "found family", "giant robots", "Spy x Family"];

function CyclingBlank() {
  const [blank, setBlank] = useState(0);
  const lineRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);

  // Cycle the word every 2.6s, unless the visitor prefers reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setBlank((b) => (b + 1) % BLANKS.length), 2600);
    return () => clearInterval(t);
  }, []);

  // Shrink the word if it's wider than its line. This runs before the browser
  // paints, so the visitor never sees an oversized word or a jump.
  useLayoutEffect(() => {
    function fit() {
      const line = lineRef.current;
      const word = wordRef.current;
      if (!line || !word) return;
      word.style.fontSize = "1em";
      const scale = Math.min(1, line.clientWidth / word.scrollWidth);
      word.style.fontSize = `${Math.floor(scale * 1000) / 1000}em`;
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [blank]);

  return (
    <span ref={lineRef} aria-hidden="true" className="block h-[1.12em] whitespace-nowrap">
      <span ref={wordRef} className="inline-block">
        <span key={blank} className="blank">{BLANKS[blank]}</span>?
      </span>
    </span>
  );
}

export function Headline() {
  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 pb-7 pt-5 sm:px-6 sm:pb-10 sm:pt-8">
      <h1 className="font-display text-[1.875rem] leading-[1.12] sm:text-[2.75rem]">
        What anime should I watch if I like <span className="sr-only">___?</span>
        <CyclingBlank />
      </h1>
      <p className="mt-3 max-w-2xl text-pretty text-[0.9375rem] text-muted sm:text-base">
        Describe a vibe or name a show you loved.
      </p>
    </section>
  );
}
