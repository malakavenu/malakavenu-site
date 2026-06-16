/**
 * Curated, EDITABLE knowledge base for the meme studio.
 *
 * Sourced from the official @YSRCParty handle, ysrcongress.com and the
 * party's broader social ecosystem. Keep entries factual — the studio is a
 * satire/parody tool; humour should come from framing and the transcript's
 * own words, NOT from inventing false claims about real people.
 */

export interface PartyProfile {
  code: string;
  name: string;
  shortName: string;
  symbol: string;
  leaders: { name: string; role: string }[];
  notes: string[];
}

/** The party we make memes FOR. */
export const YSRCP: PartyProfile = {
  code: 'ysrcp',
  name: 'Yuvajana Sramika Rythu Congress Party (వైయస్ఆర్ కాంగ్రెస్ పార్టీ)',
  shortName: 'YSRCP',
  symbol: 'Ceiling fan (Fan) — "ఫ్యాన్"',
  leaders: [
    {
      name: 'YS Jagan Mohan Reddy',
      role: 'Party President (అధ్యక్షులు), former Chief Minister of Andhra Pradesh',
    },
    { name: 'YS Bharathi Reddy', role: 'Senior leader' },
  ],
  notes: [
    'Identity colours: party-blue (#0b3aa3 / #1d68ff) + white. Accents: gold (#facc15) for celebration.',
    'Positions around welfare delivery, Navaratnalu, and the "Jagananna" personal brand.',
    'Headquarters: Plot 13, Suryadevara Township, Tadepalli, Guntur, AP 522501.',
  ],
};

/** Founding figure — YSR. Used in legacy / heritage memes. */
export const YSR_FOUNDER = {
  name: 'YS Rajashekhara Reddy (వైయస్ రాజశేఖర రెడ్డి)',
  role: 'Former Chief Minister of undivided Andhra Pradesh; YSRCP heritage figure.',
  epithets: ['మేరునగ ధీరుడు', 'మహానేత', 'రైతు పక్షపాతి'],
  legacy: [
    'Pro-farmer reforms; "వ్యవసాయం పండగ" framing (turned agriculture into a celebration).',
    'YSR Aarogyasri (free health cover) — the foundation of Jagan-era schemes.',
    'Father of YS Jagan Mohan Reddy.',
  ],
};

/** Flagship YSRCP welfare schemes / brand terms. Bilingual where it matters. */
export const YSRCP_SCHEMES: string[] = [
  'Navaratnalu (నవరత్నాలు) — the nine welfare promises',
  'Amma Vodi (అమ్మ ఒడి) — mothers’ education support',
  'Rythu Bharosa (రైతు భరోసా) — farmer income support',
  'YSR Aarogyasri (వైయస్ఆర్ ఆరోగ్యశ్రీ) — health cover',
  'Jagananna Vidya Deevena / Vasati Deevena — student fee reimbursement',
  'Jagananna Ammavodi — mothers’ schooling stipend',
  'YSR Cheyutha / Aasara (చేయూత / ఆసరా) — women’s support',
  'Volunteer–Secretariat system (సచివాలయం) — village/ward delivery',
  'Aadabidda Nidhi (ఆడబిడ్డ నిధి) — women’s dignity fund (Kutami accused of scrapping it)',
];

/** Current YSRCP slogans (real ones, in Telugu + transliteration). */
export const YSRCP_SLOGANS: string[] = [
  'మేమంతా సిద్ధం (Memantha Siddham) — "We are all ready" — core campaign slogan',
  'వెన్నుపోటుకు రెండేళ్లు (Vennupotuku Rendu Years) — "Two Years of Backstabbing" — June 2026 protest campaign',
  'రావాలి జగన్, కావాలి జగన్ (Ravali Jagan, Kavali Jagan) — mass rally chant',
  'Why Not 175 — clean-sweep ambition slogan',
  'జగనన్నే వస్తున్నాడు (Jagananne Vastunnaadu) — "Jagan is coming"',
  'నా ఫోనే నా గన్ (Naa Phone Naa Gun) — "My phone is my weapon" — youth digital activism',
  'Chalo Pothireddypadu — mass people\'s rally call (February 2026)',
  'మీ డ్రీమ్స్‌ను నా స్కీమ్స్‌తో నెరవేర్చాను — "I fulfilled your dreams with my schemes" (Jagan)',
  'కోటి సంతకాల మహోద్యమం — Crore-Signatures People\'s Movement against privatisation',
  'విప్లవం, నవశకం — "revolution, a new era"',
];

/**
 * THE central attack frame YSRCP uses against Naidu/Kutami right now —
 * "Naidu = backstab; rule = Narasura (demon Narakasura)".
 * Use sparingly and ALWAYS as framing, never as a fabricated claim.
 */
export const ATTACK_FRAMES = {
  vennupotu: {
    te: 'వెన్నుపోటు',
    en: 'Backstab',
    usage:
      'Headline frame — "వెన్నుపోటుకు రెండేళ్లు" (Two years of backstabbing), "ప్రజలకు వెన్నుపోటు" (Backstabbing the people).',
  },
  mosam: {
    te: 'చంద్రబాబు అంటే మోసం',
    en: 'Chandrababu means deceit',
    usage: 'Direct slogan from the party — works as a one-line headline on attack-cards.',
  },
  narasura: {
    te: 'నారాసుర పాలన',
    en: 'Narasura rule',
    usage:
      'YSRCP nickname for Naidu\'s rule (riff on the demon Narakasura). E.g. "రెండేళ్ల నారాసుర పాలన".',
  },
  promisesFailed: {
    te: 'హామీల అమలులో కూటమి విఫలం',
    en: 'Kutami failed to deliver promises',
    usage: 'Generic accountability frame applied to any specific scheme/sector.',
  },
  superSix: {
    te: 'సూపర్ సిక్స్ ఎక్కడ?',
    en: 'Where is the Super Six?',
    usage:
      'TDP-Janasena-BJP campaigned on the "Super Six" promises (free buses for women, ₹3000 unemployment, ₹20000 to farmers, ₹15000 to mothers per school child, ₹1500/month to women, 3 free LPG cylinders/year). YSRCP regularly demands status.',
  },
} as const;

/**
 * Live attack issues — current at the time of writing. Update freely as the
 * news cycle moves. The model picks the most relevant one for the transcript.
 */
export const LIVE_ATTACK_ISSUES = [
  {
    id: 'adabidda-nidhi',
    label: 'Aadabidda Nidhi cancellation',
    te: 'ఆడబిడ్డ నిధికి మంగళం',
    en: 'Adieu to the women’s dignity fund',
    context:
      'YSRCP says Kutami scrapped/diluted the promised "Aadabidda Nidhi" women-support payment after taking office.',
  },
  {
    id: 'visakha-steel',
    label: 'Visakha Steel Plant',
    te: 'విశాఖ స్టీల్ ప్లాంట్ ప్రమాదం',
    en: 'Visakha Steel Plant crisis',
    context:
      'Recent worker safety incident; YSRCP frames it as Kutami/BJP neglect of the public-sector steel plant.',
  },
  {
    id: 'tobacco-farmers',
    label: 'Tobacco farmers price crash',
    te: 'పొగాకు రైతుల సంక్షోభం',
    en: 'Tobacco farmers in crisis',
    context: 'Procurement prices fell; YSRCP demands intervention.',
  },
  {
    id: 'tdp-mob-attacks',
    label: 'TDP mob attacks on YSRCP cadre',
    te: 'వైయస్ఆర్‌సీపీ శ్రేణులపై టీడీపీ మూక దాడులు',
    en: 'TDP mob attacks on YSRCP workers',
    context: 'Reported attacks on party workers, rallies, and offices.',
  },
  {
    id: 'super-six-missing',
    label: 'Super Six promises pending',
    te: 'సూపర్ సిక్స్ హామీలు ఏమైనాయి?',
    en: 'What happened to the Super Six promises?',
    context:
      'Detailed list of pre-election promises by Kutami — YSRCP demands status updates and timelines.',
  },
  {
    id: 'bahirangacharcha',
    label: 'Open debate challenge',
    te: 'చంద్రబాబుతో బహిరంగ చర్చకు సిద్ధం',
    en: 'Ready for open debate with Chandrababu',
    context: 'Jagan publicly challenged Naidu to an open policy debate.',
  },
  {
    id: 'dsc-scam',
    label: 'DSC recruitment irregularities',
    te: 'డీఎస్‌సీ నియామకాల్లో అవకతవకలు — కేంద్ర దర్యాప్తు కావాలి',
    en: 'DSC recruitment scam — demand CBI probe',
    context: 'Serious irregularities in DSC-2025 teacher recruitment; Jagan demands CBI probe. YSRCP frames it as Kutami betrayal of teacher community.',
  },
  {
    id: 'fuel-price-hike',
    label: 'Fuel price hike protests',
    te: 'ఇంధన ధరల పెంపుపై నిప్పులు — నిరసన మంటలు',
    en: 'Flames of protest over Kutami fuel price hike',
    context: 'June 2026: YSRCP held statewide "Flames of Protest" demonstrations against the Chandrababu government\'s fuel price hikes affecting common people.',
  },
  {
    id: 'privatisation',
    label: 'Privatisation mega scam',
    te: 'ప్రైవేటీకరణ = మేగా స్కామ్ — కోటి సంతకాల ఉద్యమం',
    en: 'Privatisation is a mega scam — Crore Signatures Movement',
    context: 'Jagan issued an ultimatum: Kutami must reverse privatisation of public assets or face mass movement. YSRCP launched a crore-signatures campaign demanding rollback.',
  },
  {
    id: 'two-years-betrayal',
    label: 'Two Years of Backstabbing campaign',
    te: 'వెన్నుపోటుకు రెండేళ్లు — రాష్ట్రవ్యాప్త నిరసనలు',
    en: 'Two Years of Backstabbing — statewide protests',
    context: 'June 4, 2026: YSRCP launched statewide protests under "Vennupotuku Rendu Years" banner, demanding accountability for undelivered Super Six promises. Kutami\'s election manifesto and guarantee bonds were symbolically burned at mandal headquarters across AP.',
  },
] as const;
export type LiveAttackIssueId = (typeof LIVE_ATTACK_ISSUES)[number]['id'];

/**
 * Real YSRCP-aligned hashtags. Includes the long-form Telugu/English tags
 * actively used by the official @YSRCParty handle.
 */
export const YSRCP_HASHTAGS = {
  always: ['#YSRCP', '#YSJagan'],
  hype: [
    '#MemanthaSiddham',
    '#JagananneVastunnaadu',
    '#APWithJagan',
    '#Navaratnalu',
    '#VoteForFan',
    '#YSJaganAgain',
    '#WhyNot175',
    '#RavaliJagan',
    '#KavaliJagan',
    '#ChaloPothireddypadu',
  ],
  attack: [
    '#VennupotukuRenduYears',
    '#NarasuraPalana',
    '#CBNMeansBetrayal',
    '#CBNDestroyedAPin100Days',
    '#CBNShouldApologize',
    '#KutamiFailures',
    '#PromiseVsBetrayal',
    '#AadabiddaNidhikiMangalam',
    '#SuperSixEkkada',
    '#DSCScam',
    '#FuelPriceHike',
    '#PrivatisationScam',
    '#KotiSantakalu',
    '#TwoYearsOfBetrayal',
    '#AnnadataPoru',
  ],
  schemes: ['#AmmaVodi', '#RythuBharosa', '#JagananaVidyaDeevena', '#YSRAarogyasri', '#AadabiddaNidhi'],
  attackPawan: ['#PowerStarBetrayed', '#JanasenaSilence', '#PawanKalyanFailed'],
  attackBJP: ['#BJPSilent', '#KutamiDouble'],
} as const;

/** Flat list (legacy callers that want a single hashtag bank). */
export const YSRCP_HASHTAGS_FLAT: string[] = [
  ...YSRCP_HASHTAGS.always,
  ...YSRCP_HASHTAGS.hype,
  ...YSRCP_HASHTAGS.attack,
  ...YSRCP_HASHTAGS.schemes,
];

/** Opposition parties — the "Kutami" (alliance) we mainly target. */
export const OPPOSITION: PartyProfile[] = [
  {
    code: 'tdp',
    name: 'Telugu Desam Party (టీడీపీ)',
    shortName: 'TDP',
    symbol: 'Bicycle (Cycle) — "సైకిల్"',
    leaders: [
      {
        name: 'N. Chandrababu Naidu (చంద్రబాబు నాయుడు)',
        role: 'TDP President, Chief Minister of Andhra Pradesh',
      },
      { name: 'Nara Lokesh (నారా లోకేష్)', role: 'TDP General Secretary / Minister' },
    ],
    notes: [
      'Identity colour: yellow.',
      'Leads the Kutami alliance in AP.',
      'YSRCP attack nicknames: "నారాసురుడు" (Narasura), associated with "మోసం" (deceit) and "వెన్నుపోటు" (backstab).',
    ],
  },
  {
    code: 'janasena',
    name: 'Janasena Party (జనసేన)',
    shortName: 'Janasena',
    symbol: 'Glass (Tumbler) — "గ్లాస్"',
    leaders: [
      { name: 'Pawan Kalyan (పవన్ కల్యాణ్)', role: 'Janasena President, Deputy CM of AP' },
    ],
    notes: [
      'Identity colour: red.',
      'Actor-turned-politician; fan base = "Power Star" / "ప్రజారాజ్యం" lineage.',
      'YSRCP attack frame: "Power Star betrayed" — silent on Kutami failures.',
    ],
  },
  {
    code: 'bjp',
    name: 'Bharatiya Janata Party (బీజేపీ)',
    shortName: 'BJP',
    symbol: 'Lotus (కమలం)',
    leaders: [
      { name: 'BJP AP state leadership', role: 'Alliance partner' },
      { name: 'Daggubati Purandeswari', role: 'BJP AP state president' },
    ],
    notes: [
      'Identity colour: saffron.',
      'Kutami ally; national-ruling party.',
      'YSRCP attack frame: "BJP silent" on AP-specific issues (special status, steel plant).',
    ],
  },
];

/** The opposition alliance umbrella term. */
export const KUTAMI = {
  name: 'Kutami (కూటమి) — the NDA alliance in Andhra Pradesh',
  members: ['TDP', 'Janasena', 'BJP'],
  notes: [
    '"కూటమి" = alliance/coalition. Often used pejoratively in YSRCP messaging.',
    'Pre-election common manifesto headline: "Super Six" promises.',
  ],
};

/**
 * Premium pull-quotes from Jagan's documented speeches and press meets.
 * Use verbatim on quote-cards; pair with attribution "— YS Jagan Mohan Reddy".
 */
export const JAGAN_SIGNATURE_QUOTES: { te: string; en: string; context: string }[] = [
  {
    te: 'మీ ఫోనే మీకు గన్ — సోషల్ మీడియాను ఆయుధంగా చేసుకోండి',
    en: 'Your phone is your weapon — use social media as your gun',
    context: 'Jagan addressing YSRCP youth wing on digital activism.',
  },
  {
    te: 'మేము అధికారంలో రాగానే ప్రైవేటీకరణ నిర్ణయాలను రద్దు చేస్తాం',
    en: 'The moment we return to power, we will cancel all privatisation decisions',
    context: 'Jagan ultimatum to Kutami government on public asset privatisation.',
  },
  {
    te: 'రెండు నెలల్లో వారిని జైల్లో పెడతాం — చంద్రబాబుకు గట్టి గుణపాఠం చెబుతాం',
    en: 'Within two months we will put them behind bars — a stern lesson for Chandrababu',
    context: 'Jagan on accountability for Kutami leaders post-privatisation scam.',
  },
  {
    te: 'ₓ3.31 లక్షల కోట్ల అప్పుల్లో ₹2.7 లక్షల కోట్లు ప్రజా సంక్షేమానికే ఖర్చు చేశాం',
    en: 'Of ₹3.31 lakh crore borrowings, ₹2.7 lakh crore went directly to people\'s welfare',
    context: 'Jagan defending his welfare governance record.',
  },
  {
    te: 'కూటమి రెండేళ్లలో ఒక్క హామీ కూడా నెరవేర్చలేదు — ప్రజలకు వెన్నుపోటు',
    en: 'In two years, Kutami has not fulfilled a single promise — backstabbing the people',
    context: 'Jagan at the "Two Years of Backstabbing" campaign launch.',
  },
  {
    te: 'నేను ఓడిపోవడం కాదు, నన్ను ఓడించారు — కానీ నేను తిరిగి వస్తాను',
    en: 'I did not lose — I was defeated. But I will return',
    context: 'Jagan addressing cadre post-2024 election loss with resilience.',
  },
  {
    te: 'YSR నాయన నాటి ఆరోగ్యశ్రీ, అమ్మ ఒడి — అదే నా వారసత్వం, అదే నా బాధ్యత',
    en: 'Father YSR\'s Aarogyasri, Amma Vodi — that is my inheritance, that is my responsibility',
    context: 'Jagan invoking YSR legacy to frame his welfare governance.',
  },
];

/** Recurring debate themes (transcript anchors the LLM picks from). */
export const RECURRING_THEMES: string[] = [
  'Welfare delivery (Navaratnalu) vs Kutami’s "Super Six" promise status',
  'Vennupotu (backstab) — promise vs reality of Kutami government',
  'Adabidda Nidhi — was it scrapped? women’s dignity payment',
  'Visakha Steel Plant — privatisation / safety / Centre vs State blame',
  'Rythu Bharosa vs current farmer income (tobacco / paddy / horticulture)',
  'Open public debate challenge between Jagan and Naidu',
  'Amaravati single capital vs decentralised three capitals',
  'Volunteer-Secretariat system (vs current ward-secretariat dilution)',
  'YSR legacy — "మేరునగ ధీరుడు" framing of YSR vs the Kutami present',
];

/**
 * Telugu / Andhra meme STYLE guidance (voice, not images).
 * Tuned to mirror the @YSRCParty and ysrcongress.com tone.
 */
export const TELUGU_MEME_STYLE: string[] = [
  'Keep headlines punchy — under 8 words; one clear claim.',
  'Use the party-native frames where they fit: "వెన్నుపోటు", "మోసం", "నారాసుర", "మేమంతా సిద్ధం", "వెన్నుపోటుకు రెండేళ్లు".',
  'Use everyday spoken Telugu, not literary Telugu.',
  'Code-mix Telugu + English the way the party page does (e.g. "Why Not 175", "Super Six ఎక్కడ?", "DSC Scam", "Fuel Hike").',
  'For Jagan-positive memes use the "Jagananna" address + Navaratnalu pride + welfare delivery stats.',
  'For attack memes invoke the specific failed promise — name the scheme — use the "వెన్నుపోటు" frame.',
  'For protest/rally memes use march energy: "చలో", "పోరాటం", "నిప్పులు", "రగులు".',
  'Reference YSR (founder) for heritage/legacy lines — "మేరునగ ధీరుడు", "మహానేత".',
  'For stats cards use real welfare numbers: "₹2.7 లక్షల కోట్లు", "26,000 గ్రామాలు", "9 కోట్ల మంది".',
  'Tollywood reaction-face energy is fine for sarcasm; mass "elevation" tone for celebration.',
  'Avoid slurs, communal/religious angles, and personal/family attacks — stay policy-focused.',
  'Use face emojis sparingly in headlines: 💙 for YSRCP pride, 🔥 for attack/protest, ✊ for solidarity.',
];
