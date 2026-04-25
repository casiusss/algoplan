/**
 * Pure utility for deterministic avatar coloring and initials extraction.
 *
 * SECURITY: djb2 is a non-cryptographic hash by Daniel J. Bernstein (k=33).
 * It is suitable for picking a palette bucket from a name; it is NOT suitable
 * for hashing passwords, signing tokens, or any security boundary. Do not
 * misuse this function for those purposes.
 *
 * IMPORTANT: djb2 and hashToPaletteIndex are intentionally NOT memoized.
 * Memoization would defeat the determinism unit test (it would pass even
 * for a non-deterministic core because cache hits return the first result).
 * Performance is fine — djb2 over a 20-char name is sub-microsecond.
 */

// Bg + foreground class pairs, one per palette index. UI-SPEC §Color locks the order.
export const AVATAR_PALETTE = [
  "bg-tag-p0 text-tag-p0-foreground",
  "bg-tag-p1 text-tag-p1-foreground",
  "bg-tag-p2 text-tag-p2-foreground",
  "bg-tag-p3 text-tag-p3-foreground",
  "bg-brand text-brand-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
  "bg-accent text-accent-foreground",
] as const;

export type AvatarPaletteClass = (typeof AVATAR_PALETTE)[number];

/**
 * djb2 hash. Pure, deterministic, never memoized.
 * `hash = 5381; for (c of input) hash = ((hash << 5) + hash) + c.charCodeAt(0)`
 * Returns a 32-bit signed integer (may be negative — use Math.abs at the call site).
 */
export function djb2(input: string): number {
  let hash = 5381;
  if (typeof input !== "string" || input.length === 0) return hash;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash |= 0; // force 32-bit int — prevents loss of determinism on long strings
  }
  return hash;
}

export function hashToPaletteIndex(input: string): number {
  return Math.abs(djb2(input)) % AVATAR_PALETTE.length;
}

/**
 * Extract 1-2 uppercase initials from a name.
 * - Multi-word names: first letter of first word + first letter of last word.
 * - Single word: first letter only.
 * - Empty / whitespace / punctuation-only / undefined: "?".
 * - Unicode-aware (Cyrillic, accented Latin, etc.) via \p{L}\p{N}.
 * Pure function. Never throws.
 */
export function extractInitials(name: string): string {
  if (typeof name !== "string") return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // Strip leading non-alphanumeric (Unicode-aware).
  const cleaned = trimmed.replace(/^[^\p{L}\p{N}]+/u, "");
  if (!cleaned) return "?";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const firstWord = words[0]!;
  if (words.length === 1) return firstWord.charAt(0).toUpperCase();
  const lastWord = words[words.length - 1]!;
  const first = firstWord.charAt(0);
  const last = lastWord.charAt(0);
  return (first + last).toUpperCase();
}
