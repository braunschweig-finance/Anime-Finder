/** Logo, About link and the light/dark switch. The home page puts it inside the poster hero. */
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-3 sm:px-6 sm:pt-4">
      <Link href="/" className="py-2 font-display text-lg tracking-tight sm:text-xl" translate="no" aria-label={`${SITE_NAME} home`}>
        Anime<span className="text-accent-text">Finder</span>
      </Link>
      <nav aria-label="Main" className="flex items-center gap-2 sm:gap-4">
        <Link href="/about" className="px-2 py-2 text-sm font-medium text-muted hover:text-text">
          About
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
