/**
 * "Onko tämä jo kalustossa?" for the väliaikaiset kamat that omat kamat leave
 * behind. The loaner types the name by hand, so it practically never matches an
 * existing kama exactly — but "Makuupussi" next to the kalusto's "Makuupussi
 * -10°C" is the same thing, and an admin cleaning up the väliaikainen list
 * wants to see that before promoting a duplicate into the kalusto.
 *
 * The comparison is deliberately crude: case and punctuation dropped, then a
 * substring match either way between any two words of the names. Finnish
 * compounds and appended plurals ("makuupussit", "makuupussinsuoja") fall out
 * of substring matching for free, which a character-distance score would miss,
 * and going word by word is what lets a bare "Makuupussit" find the kalusto's
 * "Makuupussi -10°C". It leans towards guessing: a shared word is enough, so
 * "Musta reppu" will point at "Musta säkki". It only ever *suggests* — the
 * hint is a link, and the admin clicks through and decides.
 *
 * ponytail: an inflection that rewrites the stem ("kirveet" vs "kirves") is
 * missed. If that starts mattering, the upgrade is pg_trgm `similarity()` in
 * the query rather than a hand-rolled distance function here.
 */

export interface NamedItem {
  id: string;
  name: string;
}

/** Lowercased, everything that isn't a letter or digit collapsed to a space. */
export function normalizeItemName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Below this a substring match is noise — "puu" is inside half the kalusto. */
const MIN_SUBSTRING_LEN = 4;

/** Does any word of one name contain a (long enough) word of the other? */
function wordsOverlap(a: string[], b: string[]): boolean {
  return a.some((x) =>
    b.some(
      (y) =>
        (x.length >= MIN_SUBSTRING_LEN && y.includes(x)) ||
        (y.length >= MIN_SUBSTRING_LEN && x.includes(y)),
    ),
  );
}

/**
 * The kalusto kama `name` most likely already is, or null. An exact
 * (normalized) match beats a substring one, and among substring matches the
 * closest in length wins — so "Makuupussi" prefers "Makuupussi -10°C" over
 * "Makuupussin säilytyspussi".
 */
export function findSimilarItem<T extends NamedItem>(name: string, candidates: T[]): T | null {
  const a = normalizeItemName(name);
  if (!a) return null;
  const aWords = a.split(' ');

  let best: T | null = null;
  let bestScore = Infinity; // 0 = exact match, otherwise the length difference
  for (const candidate of candidates) {
    const b = normalizeItemName(candidate.name);
    if (!b) continue;
    const exact = a === b;
    if (!exact && !wordsOverlap(aWords, b.split(' '))) continue;
    const score = exact ? 0 : Math.abs(a.length - b.length);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
    if (bestScore === 0) break;
  }
  return best;
}
