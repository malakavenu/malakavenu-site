'use client';

import Link from 'next/link';
import { track } from '@/lib/track';
import type { TopicGroup } from '@/lib/articleTopics';

type Props = {
  topics: Pick<TopicGroup, 'id' | 'label'>[];
  counts: Record<string, number>;
};

export function WritingTopicPills({ topics, counts }: Props) {
  return (
    <div className="writing-topics-pills">
      {topics.map((g) => (
        <Link
          key={g.id}
          href={`/articles?topic=${g.id}`}
          className="writing-filter"
          onClick={() => track('topic_filter', { topic: g.id, location: 'home_teaser' })}
        >
          <span>{g.label}</span>
          <span className="writing-filter-count">{counts[g.id]}</span>
        </Link>
      ))}
    </div>
  );
}
