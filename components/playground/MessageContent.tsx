'use client';

import { memo, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

/**
 * ChatGPT-style assistant message renderer.
 *
 * Parses GFM-flavored Markdown (tables, strikethrough, task lists,
 * autolinks) and maps to design-system-aware components:
 *   - fenced code → <CodeBlock> with shiki + copy button
 *   - inline code → muted mono pill
 *   - links open in a new tab with rel=noopener
 *   - headings/lists/tables/blockquotes use scoped .mc-* styles
 *     defined alongside ChatTab so message typography is contained.
 *
 * Memoized on `(content, streaming)` so the parent message list, which
 * re-renders on every streamed token, doesn't re-parse messages whose
 * text didn't change.
 */

type Props = {
  content: string;
  streaming?: boolean;
};

function MessageContentImpl({ content, streaming = false }: Props) {
  return (
    <div className="mc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...props }: ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
            const text = String(children ?? '').replace(/\n$/, '');
            // react-markdown 9 dropped the `inline` prop; we infer block vs
            // inline from whether a language class is present (block code) or
            // the source contains a newline.
            const isBlock = /language-/.test(className ?? '') || text.includes('\n');
            if (!isBlock) {
              return (
                <code className="mc-inline-code" {...props}>
                  {children}
                </code>
              );
            }
            const lang = /language-(\w+)/.exec(className ?? '')?.[1];
            return <CodeBlock code={text} language={lang} streaming={streaming} />;
          },
          // react-markdown wraps fenced code in <pre><code>; we render the
          // entire block ourselves in <code>, so neutralise <pre>.
          pre: ({ children }) => <>{children}</>,
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mc-link"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MessageContent = memo(MessageContentImpl, (prev, next) => {
  return prev.content === next.content && prev.streaming === next.streaming;
});
