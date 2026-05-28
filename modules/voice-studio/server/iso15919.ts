/**
 * ISO-15919 Romanisation for Telugu and Tamil.
 *
 * Used by Praxy R6 (which needs romanised input) and code-mix mode.
 * This is a simplified but functional mapping covering the most common
 * characters. For production, consider a full ICU transliterator.
 */

// ─── Telugu → ISO-15919 ─────────────────────────────────────────────────────

const TELUGU_VOWELS: Record<string, string> = {
  'అ': 'a', 'ఆ': 'ā', 'ఇ': 'i', 'ఈ': 'ī', 'ఉ': 'u', 'ఊ': 'ū',
  'ఋ': 'r̥', 'ౠ': 'r̥̄', 'ఌ': 'l̥', 'ౡ': 'l̥̄',
  'ఎ': 'e', 'ఏ': 'ē', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'ō', 'ఔ': 'au',
};

const TELUGU_VOWEL_SIGNS: Record<string, string> = {
  'ా': 'ā', 'ి': 'i', 'ీ': 'ī', 'ు': 'u', 'ూ': 'ū',
  'ృ': 'r̥', 'ౄ': 'r̥̄', 'ె': 'e', 'ే': 'ē', 'ై': 'ai',
  'ొ': 'o', 'ో': 'ō', 'ౌ': 'au',
};

const TELUGU_CONSONANTS: Record<string, string> = {
  'క': 'ka', 'ఖ': 'kha', 'గ': 'ga', 'ఘ': 'gha', 'ఙ': 'ṅa',
  'చ': 'ca', 'ఛ': 'cha', 'జ': 'ja', 'ఝ': 'jha', 'ఞ': 'ña',
  'ట': 'ṭa', 'ఠ': 'ṭha', 'డ': 'ḍa', 'ఢ': 'ḍha', 'ణ': 'ṇa',
  'త': 'ta', 'థ': 'tha', 'ద': 'da', 'ధ': 'dha', 'న': 'na',
  'ప': 'pa', 'ఫ': 'pha', 'బ': 'ba', 'భ': 'bha', 'మ': 'ma',
  'య': 'ya', 'ర': 'ra', 'ల': 'la', 'వ': 'va', 'శ': 'śa',
  'ష': 'ṣa', 'స': 'sa', 'హ': 'ha', 'ళ': 'ḷa', 'ఱ': 'ṟa',
};

const TELUGU_VIRAMA = '\u0C4D'; // ్
const TELUGU_ANUSVARA = 'ం';
const TELUGU_VISARGA = 'ః';

// ─── Tamil → ISO-15919 ──────────────────────────────────────────────────────

const TAMIL_VOWELS: Record<string, string> = {
  'அ': 'a', 'ஆ': 'ā', 'இ': 'i', 'ஈ': 'ī', 'உ': 'u', 'ஊ': 'ū',
  'எ': 'e', 'ஏ': 'ē', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'ō', 'ஔ': 'au',
};

const TAMIL_VOWEL_SIGNS: Record<string, string> = {
  'ா': 'ā', 'ி': 'i', 'ீ': 'ī', 'ு': 'u', 'ூ': 'ū',
  'ெ': 'e', 'ே': 'ē', 'ை': 'ai', 'ொ': 'o', 'ோ': 'ō', 'ௌ': 'au',
};

const TAMIL_CONSONANTS: Record<string, string> = {
  'க': 'ka', 'ங': 'ṅa', 'ச': 'ca', 'ஞ': 'ña', 'ட': 'ṭa',
  'ண': 'ṇa', 'த': 'ta', 'ந': 'na', 'ப': 'pa', 'ம': 'ma',
  'ய': 'ya', 'ர': 'ra', 'ல': 'la', 'வ': 'va', 'ழ': 'ḻa',
  'ள': 'ḷa', 'ற': 'ṟa', 'ன': 'ṉa', 'ஜ': 'ja', 'ஷ': 'ṣa',
  'ஸ': 'sa', 'ஹ': 'ha',
};

const TAMIL_VIRAMA = '\u0BCD'; // ்

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Romanise Telugu text to ISO-15919.
 */
export function romaniseTelugu(text: string): string {
  let result = '';
  const chars = [...text];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    // Anusvara
    if (ch === TELUGU_ANUSVARA) {
      result += 'ṁ';
      continue;
    }

    // Visarga
    if (ch === TELUGU_VISARGA) {
      result += 'ḥ';
      continue;
    }

    // Independent vowel
    if (TELUGU_VOWELS[ch]) {
      result += TELUGU_VOWELS[ch];
      continue;
    }

    // Consonant
    if (TELUGU_CONSONANTS[ch]) {
      const base = TELUGU_CONSONANTS[ch].slice(0, -1); // Remove inherent 'a'
      const next = chars[i + 1];

      if (next === TELUGU_VIRAMA) {
        // Halant — no inherent vowel
        result += base;
        i++; // skip virama
      } else if (next && TELUGU_VOWEL_SIGNS[next]) {
        // Consonant + vowel sign
        result += base + TELUGU_VOWEL_SIGNS[next];
        i++; // skip vowel sign
      } else {
        // Inherent 'a'
        result += TELUGU_CONSONANTS[ch];
      }
      continue;
    }

    // Pass through (spaces, punctuation, Latin chars, digits)
    result += ch;
  }

  return result;
}

/**
 * Romanise Tamil text to ISO-15919.
 */
export function romaniseTamil(text: string): string {
  let result = '';
  const chars = [...text];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    // Independent vowel
    if (TAMIL_VOWELS[ch]) {
      result += TAMIL_VOWELS[ch];
      continue;
    }

    // Consonant
    if (TAMIL_CONSONANTS[ch]) {
      const base = TAMIL_CONSONANTS[ch].slice(0, -1);
      const next = chars[i + 1];

      if (next === TAMIL_VIRAMA) {
        result += base;
        i++;
      } else if (next && TAMIL_VOWEL_SIGNS[next]) {
        result += base + TAMIL_VOWEL_SIGNS[next];
        i++;
      } else {
        result += TAMIL_CONSONANTS[ch];
      }
      continue;
    }

    result += ch;
  }

  return result;
}

/**
 * Auto-detect script and romanise. Passes Latin text through unchanged.
 */
export function romanise(text: string, langHint?: 'te' | 'ta'): string {
  if (langHint === 'te') return romaniseTelugu(text);
  if (langHint === 'ta') return romaniseTamil(text);

  // Auto-detect: check for Telugu or Tamil Unicode ranges
  const hasTeluguChars = /[\u0C00-\u0C7F]/.test(text);
  const hasTamilChars = /[\u0B80-\u0BFF]/.test(text);

  if (hasTeluguChars && !hasTamilChars) return romaniseTelugu(text);
  if (hasTamilChars && !hasTeluguChars) return romaniseTamil(text);

  // Mixed or neither — process character by character
  let result = '';
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0C00 && code <= 0x0C7F) {
      result += romaniseTelugu(ch);
    } else if (code >= 0x0B80 && code <= 0x0BFF) {
      result += romaniseTamil(ch);
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * For code-mix: romanise only the Indic portions, leave Latin as-is.
 * This is the preprocessing step for IndicF5 code-mix mode.
 */
export function romaniseCodeMix(text: string): string {
  return romanise(text);
}
