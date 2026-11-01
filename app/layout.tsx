/**
 * The frame around every page: fonts, header, footer, SEO defaults.
 */
import type { Metadata, Viewport } from "next";
import { Dela_Gothic_One, Zen_Kaku_Gothic_New } from "next/font/google";
import Link from "next/link";
import { preconnect } from "react-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

// Display font for headlines: chunky, Japanese-poster feel.
const dela = Dela_Gothic_One({ weight: "400", subsets: ["latin"], variable: "--font-dela", display: "swap" });
// Body font: a clean Japanese gothic that also renders Japanese titles nicely.
const zen = Zen_Kaku_Gothic_New({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-zen", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: what anime should I watch next?`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["anime recommendations", "anime like", "what anime should I watch", "find anime by description", "forgot anime name"],
  openGraph: { type: "website", siteName: SITE_NAME, url: "/", description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  // Matches the dark page background (dark is the default). ThemeToggle updates it when switching.
  themeColor: "#14122b",
  width: "device-width",
  initialScale: 1,
};

/** Runs before the page paints: applies the saved light/dark choice (dark by default). */
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;if(t==="light")document.addEventListener("DOMContentLoaded",function(){var m=document.querySelector('meta[name="theme-color"]');if(m)m.content="#f4f3fa"})}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Cover art comes from AniList's image server: open that connection early.
  preconnect("https://s4.anilist.co");
  return (
    <html lang="en" data-theme="dark" className={`${dela.variable} ${zen.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
          Skip to content
        </a>
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-4 sm:px-6">
          <Link href="/" className="py-2 font-display text-lg tracking-tight sm:text-xl" translate="no" aria-label={`${SITE_NAME} home`}>
            Anime<span className="text-sakura">Finder</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-2 sm:gap-4">
            <Link href="/about" className="px-2 py-2 text-sm font-medium text-muted hover:text-text">
              About
            </Link>
            <ThemeToggle />
          </nav>
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>

        <footer className="mt-12 border-t border-line">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              Anime data from{" "}
              <a href="https://anilist.co" className="text-sky underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                AniList
              </a>
              . Not affiliated with AniList or any studio.
            </p>
            <nav aria-label="Footer" className="flex gap-6">
              <Link href="/" className="py-2 hover:text-text">Search</Link>
              <Link href="/about" className="py-2 hover:text-text">About</Link>
              <Link href="/privacy" className="py-2 hover:text-text">Privacy</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
