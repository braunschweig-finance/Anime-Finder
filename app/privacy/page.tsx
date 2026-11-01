import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Anime Finder does with your searches, including sending some to Google Gemini.",
  alternates: { canonical: "/privacy" },
};

// Update this date whenever the policy changes.
const UPDATED = "November 1, 2026";

export default function PrivacyPage() {
  return (
    <div className="prose-page mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl sm:text-4xl">Privacy policy</h1>
      <p className="mt-2 text-sm">Last updated {UPDATED}</p>

      <h2>The short version</h2>
      <p>
        You don&apos;t need an account, and we don&apos;t ask for your name or email. What you type into the search boxes is
        sent to the services below so we can find shows for you.
      </p>

      <h2>Where your searches go</h2>
      <ul>
        <li>
          <strong className="text-text">Google Gemini.</strong> Text you type in “Find my next anime” and
          “Forgot the name?” is sent to Google&apos;s Gemini API to understand your request and explain picks.
          Google handles that data under its own terms and{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.
          On Gemini&apos;s free tier, Google may use submitted text to improve its products, so please don&apos;t type
          personal information into the search boxes.
        </li>
        <li>
          <strong className="text-text">AniList.</strong> Search terms and show titles are sent to the{" "}
          <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a> API to look up shows. Cover
          images load directly from AniList&apos;s servers.
        </li>
        <li>
          <strong className="text-text">Our hosting provider (Vercel)</strong> keeps standard server logs, such as IP
          address and pages requested, for security and to keep the site running.
        </li>
      </ul>

      <h2>What we store</h2>
      <p>
        We temporarily cache search results so repeat searches are faster. Cached results are not linked to you. Your
        light/dark mode choice is saved in your own browser only.
      </p>

      <h2>Ads and affiliate links</h2>
      <p>
        We may show ads from Google AdSense in the future. If we do, Google and its partners may use cookies to show ads
        based on your visits to this and other sites, and we&apos;ll update this page and ask for consent where the law
        requires it. You can manage ad personalization at{" "}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>.
        Some “Watch on…” links may be affiliate links that tell the streaming service we referred you.
      </p>

      <h2>Children</h2>
      <p>Anime Finder is not directed at children under 13, and we don&apos;t knowingly collect their information.</p>

      <h2>Contact</h2>
      <p>
        Questions about this policy?{" "}
        {CONTACT_EMAIL ? (
          <>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>
        ) : (
          <>Contact details will be added here soon.</>
        )}
      </p>
    </div>
  );
}
