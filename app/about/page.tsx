import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "How Anime Finder picks shows: real AniList data, with AI used only to understand your request and explain picks.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
    <SiteHeader />
    <div className="prose-page mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl sm:text-4xl">About Anime Finder</h1>
      <p className="mt-4">
        Anime Finder answers one question: what should I watch next? It&apos;s free, and you don&apos;t need an account.
      </p>

      <h2>Three ways to search</h2>
      <ul>
        <li><strong className="text-text">Find my next anime:</strong> describe the kind of show you want in your own words, and get picks with a short reason for each.</li>
        <li><strong className="text-text">If you liked…:</strong> pick a show you loved and see similar ones, with what each has in common.</li>
        <li><strong className="text-text">Forgot the name?:</strong> list what you remember, like a character&apos;s hair color or a plot moment, and get likely matches.</li>
      </ul>

      <h2>Where the shows come from</h2>
      <p>
        Every result is a real entry from <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a>,
        a community anime database. Scores, episode counts, and streaming links come from AniList too.
      </p>
      <p>
        For the first and third tabs, Google&apos;s Gemini AI helps turn your description into search terms and writes the
        one-line reasons. The AI can only choose from shows AniList returned, so it can&apos;t make up a title. If the AI is
        busy, you&apos;ll still get results from a simpler keyword search.
      </p>

      <h2>Links and ads</h2>
      <p>
        Anime Finder is free because of ads and affiliate links. Some “Watch on…” links may earn us a small commission
        if you sign up for a service. It doesn&apos;t change which shows we recommend.
      </p>
      <p>
        See the <Link href="/privacy">privacy policy</Link> for what happens to your searches.
      </p>
    </div>
    </>
  );
}
