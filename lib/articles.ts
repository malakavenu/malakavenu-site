import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

export type ArticleFrontmatter = {
  title: string;
  description: string;
  date: string;
  updated?: string;
  category?: string;
  tags?: string[];
  cover?: string;
  ogImage?: string;
  draft?: boolean;
  author?: string;
};

export type ArticleMeta = ArticleFrontmatter & {
  slug: string;
  readingTimeText: string;
  readingTimeMinutes: number;
  wordCount: number;
};

export type Article = ArticleMeta & {
  content: string;
};

const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles');

async function readArticleFile(slug: string): Promise<Article | null> {
  try {
    const file = await fs.readFile(path.join(ARTICLES_DIR, `${slug}.mdx`), 'utf8');
    const { data, content } = matter(file);
    const fm = data as Partial<ArticleFrontmatter>;
    if (!fm.title || !fm.date) return null;
    const stats = readingTime(content);
    return {
      slug,
      title: fm.title,
      description: fm.description ?? '',
      date: fm.date,
      updated: fm.updated,
      category: fm.category,
      tags: fm.tags,
      cover: fm.cover,
      ogImage: fm.ogImage,
      draft: fm.draft,
      author: fm.author,
      content,
      readingTimeText: stats.text,
      readingTimeMinutes: Math.max(1, Math.round(stats.minutes)),
      wordCount: stats.words,
    };
  } catch {
    return null;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  try {
    const files = await fs.readdir(ARTICLES_DIR);
    return files
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.replace(/\.mdx$/, ''));
  } catch {
    return [];
  }
}

export async function getAllArticles(): Promise<ArticleMeta[]> {
  const slugs = await getAllSlugs();
  const articles = (await Promise.all(slugs.map((s) => readArticleFile(s))))
    .filter((a): a is Article => Boolean(a) && !a!.draft)
    .map((a) => {
      const { content, ...meta } = a;
      void content;
      return meta;
    });

  return articles.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const article = await readArticleFile(slug);
  if (!article || article.draft) return null;
  return article;
}
