/**
 * Convert MDX/Markdown body into a clean plain-text string suitable for TTS.
 *
 * Strips JSX, code fences, images, and Markdown syntax. Conservative: any
 * residue is fine — TTS will gracefully ignore stray characters.
 *
 * Used by:
 *   - the article page (live "Listen" button text payload)
 *   - the offline bake script (scripts/bake-audio) so pre-generated MP3s
 *     match the live fallback exactly.
 */
export function toSpeakable(mdx: string): string {
  return mdx
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#+\s+/gm, '')
    .replace(/[*_~>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
