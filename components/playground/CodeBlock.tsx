'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Chat code block — ChatGPT-style:
 *   ┌─────────────────────────────────┐
 *   │ language          [Copy]        │  ← header bar
 *   ├─────────────────────────────────┤
 *   │ syntax-highlighted code         │
 *   │ horizontal scroll on overflow   │
 *   └─────────────────────────────────┘
 *
 * Highlighting strategy:
 *   - While the message is still streaming the code stays as plain
 *     monospaced text (cheap, no jank, no per-token reparse).
 *   - Once the parent flips `streaming` to false, we lazy-import shiki
 *     and replace the raw <code> with a syntax-highlighted version.
 *   - The shiki theme matches the article pipeline (`github-dark-dimmed`)
 *     so chat output and article code blocks look identical.
 */

type Props = {
  code: string;
  language?: string;
  /** True while the parent message is still streaming tokens. */
  streaming?: boolean;
};

// Singleton highlighter — created once across the whole app.
// `any` is intentional: shiki's bundled type surface is large and we
// only call two members (`getLoadedLanguages`, `loadLanguage`, `codeToHtml`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let highlighterPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getHighlighter(): Promise<any> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then((shiki) =>
      shiki.createHighlighter({
        themes: ['github-dark-dimmed'],
        // Pre-load the languages a chat assistant ships most of the time.
        // Anything else is loaded on-demand below.
        langs: ['ts', 'tsx', 'js', 'jsx', 'json', 'bash', 'shell', 'md', 'html', 'css'],
      }),
    );
  }
  return highlighterPromise;
}

const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  md: 'markdown',
  html: 'html',
  css: 'css',
  json: 'json',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cs: 'csharp',
};

function normalizeLang(input?: string): string {
  if (!input) return 'text';
  const lower = input.toLowerCase().trim();
  return LANG_ALIASES[lower] ?? lower;
}

export function CodeBlock({ code, language, streaming = false }: Props) {
  const lang = normalizeLang(language);
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Highlight only when the message has settled, to avoid 30 reparses
  // per second during streaming. While streaming we keep `html` as null
  // (its initial value) so the plain-text fallback renders.
  useEffect(() => {
    if (streaming) return;
    let cancelled = false;
    (async () => {
      try {
        const highlighter = await getHighlighter();
        if (lang !== 'text' && !highlighter.getLoadedLanguages().includes(lang)) {
          await highlighter.loadLanguage(lang).catch(() => {
            /* unsupported language — fall back to plain text */
          });
        }
        const safeLang = highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
        const out = highlighter.codeToHtml(code, {
          lang: safeLang,
          theme: 'github-dark-dimmed',
        });
        if (!cancelled && mountedRef.current) setHtml(out);
      } catch {
        // Shiki failed to load — keep raw text fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, lang, streaming]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => mountedRef.current && setCopied(false), 1400);
    } catch {
      // clipboard blocked — silent
    }
  }

  return (
    <div className="cb">
      <div className="cb-head">
        <span className="cb-lang">{language?.toLowerCase() || 'text'}</span>
        <button
          type="button"
          className="cb-copy"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      {html ? (
        <div
          className="cb-body cb-body--shiki"
          // Shiki output is sanitized (escaped + scoped to <pre>/<code>/<span>).
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="cb-body cb-body--plain"><code>{code}</code></pre>
      )}
    </div>
  );
}
