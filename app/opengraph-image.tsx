import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

export const alt = `${SITE.name} — AI & Agentic Systems Engineer · Frontend Architect`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background:
            'linear-gradient(135deg, #0c0e16 0%, #14182a 60%, #0c0e16 100%)',
          fontFamily: 'sans-serif',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(800px 500px at 0% 0%, rgba(124,92,255,0.32), transparent 60%), radial-gradient(700px 500px at 100% 100%, rgba(34,211,238,0.22), transparent 60%)',
            display: 'flex',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #7c5cff 0%, #22d3ee 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5, display: 'flex' }}>
            malakavenu.com
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 24,
              color: '#a5b4fc',
              letterSpacing: 4,
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            AI &amp; Agentic Systems · Frontend Architect
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1040,
              display: 'flex',
            }}
          >
            Malaka Venugopal Reddy
          </div>
          <div
            style={{
              fontSize: 30,
              color: '#cdd1de',
              maxWidth: 1040,
              lineHeight: 1.35,
              display: 'flex',
            }}
          >
            Building agent skills, subagents &amp; MCP servers on AWS Bedrock, OpenAI &amp;
            Anthropic — woven into production frontends.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#8a93a6',
            fontSize: 22,
          }}
        >
          <div style={{ display: 'flex' }}>Bangalore · India</div>
          <div style={{ display: 'flex' }}>linkedin.com/in/venumalaka</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
