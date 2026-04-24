import {
  siAngular,
  siAnthropic,
  siClaude,
  siDatadog,
  siFigma,
  siGooglechrome,
  siLangchain,
  siLighthouse,
  siLinear,
  siModelcontextprotocol,
  siNextdotjs,
  siReact,
  siSentry,
  siStorybook,
  siThreedotjs,
  siVercel,
  siVite,
  siWebgl,
  siWebpack,
  type SimpleIcon,
} from 'simple-icons';

export type ArticleVisualVariant = 'violet' | 'cyan' | 'warm';
export type ArticleOrnament = 'mesh' | 'grid' | 'bokeh' | 'rings' | 'lines';

export type ArticleVisual = {
  variant: ArticleVisualVariant;
  /** When set, render real brand SVGs (cover image). */
  logos?: SimpleIcon[];
  /** Decorative monospace label rendered when no logos, or as a small caption beside logos. */
  mono?: string;
  /** Decorative pattern rendered behind/instead of logos. */
  ornament?: ArticleOrnament;
};

const VARIANTS: ArticleVisualVariant[] = ['violet', 'cyan', 'warm'];

export const ARTICLE_VISUALS: Record<string, ArticleVisual> = {
  'agent-skills-patterns':           { variant: 'violet', logos: [siClaude],                              mono: '/skills' },
  'ai-ready-codebase-structure':     { variant: 'cyan',   logos: [siClaude],                              mono: '/CLAUDE.md' },
  'ai-and-design-systems':           { variant: 'warm',   logos: [siFigma, siClaude],                     mono: '/design×ai' },
  'angular-21-signals-zoneless':     { variant: 'warm',   logos: [siAngular],                             mono: '/v21' },
  'angular-folder-structure-for-ai-agents': { variant: 'warm', logos: [siAngular, siClaude],                mono: '/features/' },
  'bedrock-agentcore-production':    { variant: 'warm',   logos: [siAnthropic],                           mono: '/bedrock' },
  'core-web-vitals-inp-2026':        { variant: 'cyan',   logos: [siLighthouse, siGooglechrome],          mono: '/inp' },
  'creative-coding-webgl-2026':      { variant: 'cyan',   logos: [siThreedotjs, siWebgl],                 mono: '/webgl' },
  'design-engineer-role-2026':       { variant: 'cyan',   logos: [siLinear, siVercel],                    mono: '/craft' },
  'design-tokens-w3c-2026':          { variant: 'violet', logos: [siStorybook],                           mono: '/tokens' },
  'figma-make-ai-design-tooling':    { variant: 'warm',   logos: [siFigma],                               mono: '/make' },
  'geometry-of-streets-beyond-code': { variant: 'violet',                                                 mono: '/geometry',     ornament: 'grid' },
  'llm-observability-evals':         { variant: 'violet', logos: [siDatadog, siSentry],                   mono: '/observability' },
  'mcp-server-design':               { variant: 'violet', logos: [siModelcontextprotocol],                mono: '/mcp' },
  'module-federation-2-microfrontends': { variant: 'warm', logos: [siWebpack, siVite],                    mono: '/mf2' },
  'multi-agent-orchestration-2026':  { variant: 'violet', logos: [siLangchain],                           mono: '/graph' },
  'portfolio-that-gets-hired-2026':  { variant: 'warm',                                                   mono: '/portfolio',    ornament: 'rings' },
  'react-19-server-components':      { variant: 'cyan',   logos: [siReact, siNextdotjs],                  mono: '/rsc' },
  'staff-engineers-hands-on-2026':   { variant: 'cyan',                                                   mono: '/staff',        ornament: 'mesh' },
  'subagents-in-production':         { variant: 'violet', logos: [siClaude],                              mono: '/subagents' },
  'ux-trends-2026':                  { variant: 'violet',                                                 mono: '/ux',           ornament: 'bokeh' },
  'vercel-ai-sdk-generative-ui':     { variant: 'cyan',   logos: [siVercel, siNextdotjs],                 mono: '/genui' },
};

export function getArticleVisual(slug: string, fallbackIndex = 0): ArticleVisual {
  return (
    ARTICLE_VISUALS[slug] ?? {
      variant: VARIANTS[fallbackIndex % VARIANTS.length],
      mono: '/draft',
      ornament: 'lines',
    }
  );
}

const NEW_THRESHOLD_DAYS = 14;
const UPDATED_THRESHOLD_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export type ArticleFreshness = 'new' | 'updated';

export function getArticleFreshness(article: {
  date: string;
  updated?: string;
}): ArticleFreshness | null {
  const now = Date.now();
  const published = new Date(article.date).getTime();
  if (Number.isFinite(published)) {
    const ageDays = (now - published) / MS_PER_DAY;
    if (ageDays >= 0 && ageDays <= NEW_THRESHOLD_DAYS) return 'new';
  }
  if (article.updated) {
    const updated = new Date(article.updated).getTime();
    if (Number.isFinite(updated) && updated > published) {
      const ageDays = (now - updated) / MS_PER_DAY;
      if (ageDays >= 0 && ageDays <= UPDATED_THRESHOLD_DAYS) return 'updated';
    }
  }
  return null;
}
