/**
 * EMPTY placeholder for a future Google AdSense ad. No ad code is loaded.
 *
 * When AdSense approves the site, replace the inside of this component with
 * the <ins class="adsbygoogle"> snippet AdSense gives you, and add their
 * script tag in app/layout.tsx. Keep the fixed heights so the page doesn't
 * jump around when ads load (Google ranks jumpy pages lower).
 *
 * The placeholders are hidden in production unless NEXT_PUBLIC_SHOW_AD_SLOTS=1,
 * so visitors don't see empty boxes before ads are live.
 */
export const AD_SLOTS_VISIBLE = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_AD_SLOTS === "1";

export function AdSlot({ variant }: { variant: "sidebar" | "inline" }) {
  if (!AD_SLOTS_VISIBLE) return null;
  return (
    <aside
      aria-label="Advertisement"
      data-ad-slot={variant}
      className={
        "grid place-items-center rounded-xl border-2 border-dashed border-line text-xs text-muted " +
        (variant === "sidebar" ? "h-[600px] w-full" : "h-[250px] w-full lg:hidden")
      }
    >
      Ad slot ({variant === "sidebar" ? "300×600 sidebar" : "300×250 between results"})
    </aside>
  );
}
