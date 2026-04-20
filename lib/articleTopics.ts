import type { ArticleMeta } from './articles';

export type TopicGroup = {
  id: string;
  label: string;
  match: (category?: string) => boolean;
};

export const TOPIC_GROUPS: TopicGroup[] = [
  { id: 'all', label: 'All', match: () => true },
  {
    id: 'ai',
    label: 'AI · Agentic',
    match: (c) =>
      !!c &&
      /^(AI Patterns|MCP|Architecture|AWS|Generative UI|AI Evals|AI for Design)$/.test(c),
  },
  {
    id: 'frontend',
    label: 'Frontend',
    match: (c) => !!c && /^(Frontend Architecture|Frontend Platform|Performance)$/.test(c),
  },
  {
    id: 'design',
    label: 'Design Systems',
    match: (c) => !!c && /^(Design Systems|UX)$/.test(c),
  },
  {
    id: 'craft',
    label: 'Career & Craft',
    match: (c) => !!c && /^(Career|Creative Coding)$/.test(c),
  },
  {
    id: 'beyond',
    label: 'Beyond Code',
    match: (c) => c === 'Beyond Code',
  },
];

export function countsByTopic(articles: ArticleMeta[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const group of TOPIC_GROUPS) {
    result[group.id] = articles.filter((a) => group.match(a.category)).length;
  }
  return result;
}

export function topicById(id: string): TopicGroup {
  return TOPIC_GROUPS.find((g) => g.id === id) ?? TOPIC_GROUPS[0];
}

export function totalReadingMinutes(articles: ArticleMeta[]): number {
  return articles.reduce((sum, a) => sum + a.readingTimeMinutes, 0);
}
