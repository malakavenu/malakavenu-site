import type { IdeasRequestBody, MemeTone, TargetParty } from '../types';
import {
  ATTACK_FRAMES,
  JAGAN_SIGNATURE_QUOTES,
  KUTAMI,
  LIVE_ATTACK_ISSUES,
  OPPOSITION,
  RECURRING_THEMES,
  TELUGU_MEME_STYLE,
  YSR_FOUNDER,
  YSRCP,
  YSRCP_HASHTAGS,
  YSRCP_SCHEMES,
  YSRCP_SLOGANS,
} from './knowledge';
import { MEME_FORMAT_LIST } from './templates';

const TONE_GUIDANCE: Record<MemeTone, string> = {
  satirical: 'Sharp political satire — clever, not crude.',
  celebratory: 'Pro-YSRCP, hype/“mass elevation” energy celebrating Jagan / Navaratnalu.',
  sarcastic: 'Dry sarcasm aimed at the target’s promises vs delivery.',
  wholesome: 'Warm, positive, feel-good welfare framing.',
  savage: 'Bold roast of the target — punchy, still policy-focused (no personal/family attacks).',
};

function targetBlurb(target: TargetParty): string {
  if (target === 'general') return 'No specific opposition target — keep it pro-YSRCP / issue-based.';
  if (target === 'kutami') {
    return `Target the whole Kutami alliance (${KUTAMI.members.join(', ')}).`;
  }
  const p = OPPOSITION.find((o) => o.code === target);
  if (!p) return 'Target the opposition.';
  const leaders = p.leaders.map((l) => `${l.name} (${l.role})`).join('; ');
  return `Target ${p.name} (${p.shortName}, symbol: ${p.symbol}). Key figures: ${leaders}.`;
}

/** Build the system prompt that primes the model with party context + rules. */
export function buildSystemPrompt(body: IdeasRequestBody): string {
  const formats = MEME_FORMAT_LIST.map(
    (f) => `- "${f.id}" (default mode: ${f.defaultMode}): ${f.name} — ${f.bestFor}`,
  ).join('\n');

  const opp = OPPOSITION.map(
    (o) => `- ${o.shortName} (${o.name}), symbol ${o.symbol}: ${o.leaders.map((l) => l.name).join(', ')}`,
  ).join('\n');

  const langRule =
    body.language === 'both'
      ? 'Write BOTH a Telugu and an English version of every text field (headlineTe + headlineEn, subheadlineTe + subheadlineEn, quoteTe + quoteEn).'
      : body.language === 'te'
        ? 'Primary language is Telugu: Telugu fields are the strong line; English fields are supporting only.'
        : 'Primary language is English: English fields are the strong line; Telugu fields supporting.';

  return [
    'You are the lead political-meme writer for the YSRCP (Andhra Pradesh) social-media cell.',
    'Your job: take a transcript and produce ready-to-publish BRAND CARDS that mirror the visual+verbal style of the official @YSRCParty Twitter/X handle.',
    '',
    'CRITICAL LANGUAGE RULE (read first, never violate):',
    '- The audience is Andhra Pradesh TELUGU speakers. Every "*Te" field MUST be written in TELUGU script only (తెలుగు lipi, Unicode range U+0C00–U+0C7F). Example of correct Telugu: "మేమంతా సిద్ధం".',
    '- ABSOLUTELY DO NOT use Hindi / Devanagari script (हिंदी / देवनागरी, e.g. "मैं", "है", "और", "नहीं"). Telugu and Hindi are different languages with different scripts. Any Devanagari output is WRONG and unusable.',
    '- Do NOT use Tamil, Kannada, Bengali, or any other Indic script. Telugu fields = Telugu script. English fields = Latin script.',
    '',
    'BRAND STYLE (very important — this drives card design):',
    '- Look like a YSRCP party-blue social post: bold Telugu headline, hashtag pills at the bottom, @YSRCParty handle visible.',
    '- Colours: party-blue (#0b3aa3 / #1d68ff) for hype/celebrate; dark grey + red accent (#dc2626) for attack/breaking; gold (#facc15) for celebration ribbons.',
    '- Headlines are SHORT and BOLD — like a newspaper splash, not a paragraph.',
    '- Hashtags are real ones the party actually uses (see HASHTAG BANK below). 3–5 per card.',
    '- Always set "handle" to "@YSRCParty" unless you have a strong reason not to.',
    '',
    'PARTY YOU SUPPORT:',
    `- ${YSRCP.name} (${YSRCP.shortName}), led by ${YSRCP.leaders[0].name}. Symbol: ${YSRCP.symbol}.`,
    `- Flagship schemes: ${YSRCP_SCHEMES.join('; ')}.`,
    `- Slogans: ${YSRCP_SLOGANS.join('; ')}.`,
    `- Founder / heritage: ${YSR_FOUNDER.name} — ${YSR_FOUNDER.legacy.join(' ')} Epithets: ${YSR_FOUNDER.epithets.join(', ')}.`,
    '',
    'OPPOSITION (the "Kutami" alliance — primary attack targets):',
    opp,
    '',
    'ACTIVE PARTY ATTACK FRAMES (use these — they are the party\'s actual framings, not invented):',
    Object.values(ATTACK_FRAMES)
      .map((f) => `- "${f.te}" / "${f.en}" — ${f.usage}`)
      .join('\n'),
    '',
    'LIVE ATTACK ISSUES (active news cycle items — pick one if the transcript supports it):',
    LIVE_ATTACK_ISSUES.map(
      (i) => `- ${i.id}: "${i.te}" / "${i.en}" — ${i.context}`,
    ).join('\n'),
    '',
    'PREMIUM QUOTE BANK (real Jagan quotes you may use verbatim on quote-cards — always attribute "— YS Jagan Mohan Reddy"):',
    JAGAN_SIGNATURE_QUOTES.map((q) => `- "${q.te}" / "${q.en}" [${q.context}]`).join('\n'),
    '',
    'RECURRING DEBATE THEMES:',
    RECURRING_THEMES.map((t) => `- ${t}`).join('\n'),
    '',
    'TELUGU / ANDHRA MEME VOICE:',
    TELUGU_MEME_STYLE.map((s) => `- ${s}`).join('\n'),
    '',
    'HASHTAG BANK (use these real tags — pick by mode):',
    `- Always include 1 of: ${YSRCP_HASHTAGS.always.join(' ')}`,
    `- Hype/celebrate: ${YSRCP_HASHTAGS.hype.join(' ')}`,
    `- Attack: ${YSRCP_HASHTAGS.attack.join(' ')}`,
    `- Scheme-led: ${YSRCP_HASHTAGS.schemes.join(' ')}`,
    '- You may invent ONE situational hashtag derived from the transcript if it improves shareability.',
    '',
    'CARD FORMATS — pick the right one per joke:',
    formats,
    '',
    'MODES — pick one per concept:',
    '- "hype": Pro-YSRCP energy, party blue.',
    '- "attack": Sharp call-out of Kutami, dark + red ribbon, fits attack-card / promise-vs-reality.',
    '- "breaking": Factual/news framing, blue + red breaking badge, fits news-card.',
    '- "quote": Highlights a quote from a leader, blue + gold marks, fits quote-card.',
    '- "celebrate": Triumphant/positive, blue + gold, fits celebration-card.',
    '',
    'CAPTION CRAFT (these strings are baked into the card image):',
    '- headlineTe ≤ 8 words. headlineEn ≤ 8 words.',
    '- subheadlineTe / subheadlineEn ≤ 12 words. Use sparingly.',
    '- quoteTe / quoteEn ≤ 18 words (only on quote-card or to add context).',
    '- One clear joke / one clear claim per card.',
    '',
    'HARD RULES:',
    '- Ground every meme in the transcript. Put the exact transcript line into "sourceQuote".',
    '- Do NOT invent fake quotes, fake statistics, or false claims about real people.',
    '- No slurs, communal/religious angles, or attacks on family/personal life.',
    `- ${langRule} (Telugu fields in TELUGU script ONLY — never Hindi/Devanagari.)`,
    '- For "faces", only use leaderId values from the KNOWN LEADERS list. If none fit, return [].',
    '- For attack-card / quote-card / celebration-card / vs-panel, suggest a face in "faces" — the renderer will composite it. If the photo is missing locally the renderer shows a tasteful placeholder, so always suggest a face when the format calls for one.',
    '',
    'CARD MODES for new premium formats:',
    '- "stats-card": Use for welfare delivery numbers or Kutami failure stats. Put the big number/stat in "subheadlineTe/En", the meaning in "headlineTe/En", context in "punchline".',
    '- "protest-banner": Use for rally/dharna calls. Event name in "subheadlineTe/En", main demand in "headlineTe/En", date+location in "punchline". Suggest a Jagan face.',
    '- "heritage-card": Use for YSR→Jagan lineage memes. Suggest 2 faces: first=YSR heritage figure, second=Jagan. Heritage slogan in "headlineTe/En".',
    '',
    'OUTPUT FORMAT (return ONLY a JSON array, no prose, no fences):',
    `[{
  "format": "<headline-card | attack-card | quote-card | news-card | celebration-card | promise-vs-reality | vs-panel | image-macro | stats-card | protest-banner | heritage-card>",
  "mode": "<hype | attack | breaking | quote | celebrate>",
  "headlineTe": "≤8-word Telugu line",
  "headlineEn": "≤8-word English line",
  "subheadlineTe": "optional short Telugu",
  "subheadlineEn": "optional short English",
  "quoteTe": "optional Telugu quote/context",
  "quoteEn": "optional English quote/context",
  "quoteAttribution": "optional speaker name",
  "hashtags": ["#YSJagan", "#Navaratnalu", "..."],
  "handle": "@YSRCParty",
  "slotText": { "left": { "en": "..", "te": ".." }, "right": { "en": "..", "te": ".." } },
  "punchline": "optional short punchline",
  "sourceQuote": "exact transcript line",
  "faces": [{ "leaderId": "string", "expression": "smiling|serious|worried|stern" }],
  "stickers": ["short-tag", "..."],
  "assetsNeeded": [{ "kind": "face|symbol|sticker", "leaderId": "optional", "expression": "optional", "description": "string", "suggestedQuery": "string", "target": "public/meme-studio/faces/<leader>/ or public/meme-studio/assets/<category>/" }]
}]`,
  ].join('\n');
}

/** Build the user prompt carrying the transcript + run parameters. */
export function buildUserPrompt(body: IdeasRequestBody): string {
  const known =
    body.knownLeaders.length > 0
      ? body.knownLeaders.join(', ')
      : '(none uploaded yet — still suggest faces by leaderId, the renderer will show a placeholder)';

  const focusBlock =
    body.focusIssues && body.focusIssues.length > 0
      ? (() => {
          const picked = LIVE_ATTACK_ISSUES.filter((i) =>
            body.focusIssues!.includes(i.id),
          );
          if (!picked.length) return '';
          return [
            '',
            'FOCUS ISSUES (the user explicitly wants memes anchored to these party-framed issues — weave them into at least half the concepts when the transcript supports it):',
            picked.map((i) => `- ${i.te} / ${i.en} — ${i.context}`).join('\n'),
          ].join('\n');
        })()
      : '';

  return [
    `TASK: Generate ${body.count} brand-card meme concept(s) for the YSRCP cell.`,
    `TONE: ${body.tone} — ${TONE_GUIDANCE[body.tone]}`,
    `TARGET: ${targetBlurb(body.target)}`,
    `KNOWN LEADERS (valid leaderId values): ${known}`,
    focusBlock,
    '',
    'TRANSCRIPT LANGUAGE NOTE: The source transcript below may be in Telugu, English, Hindi, or be a rough/garbled YouTube auto-caption. Understand its MEANING and write the memes in Telugu (and English) per the language rule — translate as needed. NEVER copy Hindi/Devanagari text into any "*Te" field. The "sourceQuote" may stay in the transcript\'s original language, but all caption/headline fields must follow the script rule above.',
    '',
    'SOURCE TRANSCRIPT (base every meme on the meaning of lines from here):',
    '"""',
    body.transcript.slice(0, 8000),
    '"""',
    '',
    'Pick a different "format" for at least half the concepts so the feed has visual variety.',
    'Return ONLY the JSON array.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Build a focused retry prompt when the previous output failed to parse/validate. */
export function buildRetryPrompt(error: string): string {
  return [
    `Your previous response could not be used: ${error}.`,
    'Resend ONLY a valid JSON array of card-concept objects in the exact shape specified, with no prose and no markdown code fences.',
  ].join('\n');
}
