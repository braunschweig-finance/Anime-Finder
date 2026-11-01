/**
 * The no-AI fallback: pull AniList genres and tags out of plain English.
 *
 * When Gemini is unavailable we still want "a sad fantasy about an elf" to
 * find Frieren. We do it two ways:
 *   1. Any AniList genre/tag name that appears in the text (e.g. "isekai").
 *   2. A hand-made list of everyday words → AniList genres/tags (e.g. "sad" → Drama, Tragedy).
 * Every result is checked against AniList's real list, so a typo here can't
 * produce a fake tag.
 */
import type { Vocabulary } from "./anilist";

/** Everyday words → AniList genres/tags. Keys are matched as whole words. */
const SYNONYMS: Record<string, string[]> = {
  sad: ["Drama", "Tragedy"],
  "tear jerker": ["Drama", "Tragedy"],
  cry: ["Drama", "Tragedy"],
  emotional: ["Drama"],
  depressing: ["Tragedy", "Psychological"],
  funny: ["Comedy"],
  hilarious: ["Comedy"],
  wholesome: ["Slice of Life", "Iyashikei"],
  cozy: ["Slice of Life", "Iyashikei"],
  chill: ["Slice of Life", "Iyashikei"],
  relaxing: ["Iyashikei", "Slice of Life"],
  hype: ["Action", "Shounen"],
  battle: ["Action"],
  fight: ["Action"],
  fighting: ["Action", "Martial Arts"],
  fights: ["Action"],
  sword: ["Swordplay"],
  swords: ["Swordplay"],
  "found family": ["Found Family"],
  crew: ["Ensemble Cast", "Found Family"],
  elf: ["Elf"],
  elves: ["Elf"],
  demon: ["Demons"],
  demons: ["Demons"],
  "demon slayer": ["Demons", "Swordplay"],
  magic: ["Magic"],
  wizard: ["Magic"],
  witch: ["Magic", "Witch"],
  dragon: ["Dragons"],
  dragons: ["Dragons"],
  vampire: ["Vampire"],
  vampires: ["Vampire"],
  zombie: ["Zombie"],
  zombies: ["Zombie"],
  ghost: ["Ghost", "Supernatural"],
  ghosts: ["Ghost", "Supernatural"],
  scary: ["Horror"],
  creepy: ["Horror", "Psychological"],
  "mind games": ["Psychological", "Thriller"],
  smart: ["Psychological"],
  genius: ["Psychological"],
  detective: ["Detective", "Mystery"],
  murder: ["Mystery", "Crime"],
  love: ["Romance"],
  "love story": ["Romance"],
  romantic: ["Romance"],
  "rom com": ["Romance", "Comedy"],
  "romcom": ["Romance", "Comedy"],
  robot: ["Mecha", "Robots"],
  robots: ["Mecha", "Robots"],
  "giant robots": ["Mecha"],
  space: ["Space", "Sci-Fi"],
  future: ["Sci-Fi"],
  futuristic: ["Sci-Fi"],
  "time travel": ["Time Manipulation"],
  "time loop": ["Time Loop", "Time Manipulation"],
  apocalypse: ["Post-Apocalyptic"],
  "post apocalyptic": ["Post-Apocalyptic"],
  dystopia: ["Dystopian"],
  dystopian: ["Dystopian"],
  "another world": ["Isekai"],
  "reincarnated": ["Isekai", "Reincarnation"],
  reincarnation: ["Reincarnation"],
  "video game": ["Video Games"],
  pirate: ["Pirates"],
  pirates: ["Pirates"],
  ninja: ["Ninja"],
  ninjas: ["Ninja"],
  samurai: ["Samurai"],
  school: ["School"],
  "high school": ["School"],
  sports: ["Sports"],
  basketball: ["Basketball"],
  volleyball: ["Volleyball"],
  soccer: ["Football"],
  football: ["Football"],
  baseball: ["Baseball"],
  music: ["Music"],
  band: ["Music", "Band"],
  idol: ["Idol"],
  idols: ["Idol"],
  cooking: ["Food"],
  military: ["Military"],
  war: ["War", "Military"],
  revenge: ["Revenge"],
  survival: ["Survival"],
  superpowers: ["Super Power"],
  "super powers": ["Super Power"],
  superhero: ["Super Power", "Superhero"],
  fire: ["Super Power", "Firefighters"],
  firefighter: ["Firefighters"],
  firefighters: ["Firefighters"],
  "slow burn": ["Romance", "Slow When It Comes To Love"],
  journey: ["Travel", "Adventure"],
  travel: ["Travel", "Adventure"],
  adventure: ["Adventure"],
  "coming of age": ["Coming of Age"],
  "strong female lead": ["Female Protagonist"],
  "female lead": ["Female Protagonist"],
  "girl protagonist": ["Female Protagonist"],
  "anti hero": ["Anti-Hero"],
  antihero: ["Anti-Hero"],
  // "Villainess" on AniList means otome-game villainess stories, so plain "villain" doesn't map to it.
  villain: ["Anti-Hero"],
  villainess: ["Villainess"],
  immortal: ["Time Skip"],
  outlives: ["Time Skip"],
  outlive: ["Time Skip"],
  "mind game": ["Psychological", "Thriller"],
  adults: ["Primarily Adult Cast"],
  adult: ["Primarily Adult Cast"],
  office: ["Office", "Work"],
  "at work": ["Work"],
  coworkers: ["Work", "Primarily Adult Cast"],
  gore: ["Gore"],
  dark: ["Psychological", "Tragedy"],
  "dark fantasy": ["Fantasy", "Tragedy"],
  gods: ["Gods", "Mythology"],
  mythology: ["Mythology"],
  philosophical: ["Philosophy"],
  "time skip": ["Time Skip"],
  cute: ["Cute Girls Doing Cute Things", "Slice of Life"],
  family: ["Family Life"],
  cyberpunk: ["Cyberpunk"],
  steampunk: ["Steampunk"],
  historical: ["Historical"],
  "feudal japan": ["Historical", "Samurai"],
};

/** Tag names that are also everyday words; only matched through SYNONYMS, never directly. */
const AMBIGUOUS_TAGS = new Set(["Food", "Work", "Family Life", "Love Triangle", "School", "Office", "Time Skip"]);

/** Escape a string for use inside a regular expression. */
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True if `phrase` appears in `text` as whole word(s), ignoring case and hyphens. */
function hasPhrase(text: string, phrase: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[-_']/g, " ");
  return new RegExp(`\\b${esc(norm(phrase))}\\b`).test(norm(text));
}

export interface Extracted {
  genres: string[];
  tags: string[];
}

/** Find AniList genres and tags mentioned (directly or via everyday words) in `text`. */
export function extractKeywords(text: string, vocab: Vocabulary): Extracted {
  const genreSet = new Map(vocab.genres.map((g) => [g.toLowerCase(), g]));
  const tagSet = new Map(vocab.tags.map((t) => [t.name.toLowerCase(), t.name]));
  const genres = new Set<string>();
  const tags = new Set<string>();

  const add = (name: string) => {
    const k = name.toLowerCase();
    if (genreSet.has(k)) genres.add(genreSet.get(k)!);
    else if (tagSet.has(k)) tags.add(tagSet.get(k)!);
  };

  // 1. Direct mentions of real genre/tag names. Skipped: very short names, audience labels
  //    ("kids" in "kids escape an orphanage" is not the Kids demographic), and everyday words
  //    that are rarely meant as a theme ("raised as food for monsters" is not a cooking show).
  for (const g of vocab.genres) if (hasPhrase(text, g)) add(g);
  for (const t of vocab.tags) {
    if (t.name.length <= 3 || t.category === "Demographic" || AMBIGUOUS_TAGS.has(t.name)) continue;
    if (hasPhrase(text, t.name)) add(t.name);
  }

  // 2. Everyday words.
  for (const [word, mapped] of Object.entries(SYNONYMS)) {
    if (hasPhrase(text, word)) mapped.forEach(add);
  }

  return { genres: [...genres], tags: [...tags] };
}

/** Pull "X" out of "anime like X" / "similar to X" / "if I liked X". */
export function extractLikeTitle(text: string): string | null {
  const m = text.match(/\b(?:like|liked|similar to|loved|enjoyed)\s+["“']?([^,.;!?"”]+?)["”']?\s*(?:$|[,.;!?]|\bbut\b|\band\b|\bwith\b)/i);
  if (!m) return null;
  const t = m[1].trim();
  // "like a sad fantasy..." is a description, not a title.
  if (/^(a|an|the|some|something|anything|shows?|anime)\b/i.test(t) || t.split(" ").length > 6) return null;
  return t;
}
