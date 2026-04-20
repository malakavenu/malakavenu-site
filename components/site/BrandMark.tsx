type Props = { gradId?: string };

export function BrandMark({ gradId = 'lm' }: Props) {
  return (
    <svg className="brand-mark" viewBox="0 0 36 36" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="34"
        height="34"
        rx="10"
        fill="rgba(124,92,255,0.10)"
        stroke={`url(#${gradId})`}
        strokeWidth="1.4"
      />
      <path
        d="M9 25 L9 11 L13 11 L18 19 L23 11 L27 11 L27 25"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="27" cy="25" r="2" fill={`url(#${gradId})`} />
    </svg>
  );
}
