#!/usr/bin/env node
// One-shot generator for /public/images/og-image.png.
//
// Composition (1200×630, the canonical OG/Twitter card size):
//   ┌──────────────────────────────────┬────────────────────┐
//   │  brand mark + name + tagline +   │   portrait photo   │
//   │  URL on dark gradient bg         │   (avatar-2026)    │
//   └──────────────────────────────────┴────────────────────┘
//
// Re-run after refreshing the avatar/hero asset:
//   node scripts/build-og-image.mjs

import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const AVATAR = path.join(ROOT, 'public/images/avatar-2026.png');
const OUT = path.join(ROOT, 'public/images/og-image.png');

const W = 1200;
const H = 630;
const PHOTO_W = 460;

async function main() {
  // Crop avatar (640×640) into a portrait that fills the right column.
  // We center-crop a 4:5 slice so the head sits in the upper third.
  const photoBuf = await sharp(AVATAR)
    .resize({ width: PHOTO_W, height: H, fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  // Soft fade on the photo's left edge so it blends into the gradient bg.
  const fadeMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO_W}" height="${H}">
       <defs>
         <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
           <stop offset="0" stop-color="white" stop-opacity="0"/>
           <stop offset="0.18" stop-color="white" stop-opacity="1"/>
           <stop offset="1" stop-color="white" stop-opacity="1"/>
         </linearGradient>
       </defs>
       <rect width="${PHOTO_W}" height="${H}" fill="url(#fade)"/>
     </svg>`,
  );
  const fadedPhoto = await sharp(photoBuf)
    .composite([{ input: fadeMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Background panel + brand text rendered as one big SVG, then we overlay
  // the photo on top. Inter is not embedded — the OS default sans-serif
  // matches the dynamic /opengraph-image route closely enough.
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
       <defs>
         <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0" stop-color="#0c0e16"/>
           <stop offset="0.6" stop-color="#14182a"/>
           <stop offset="1" stop-color="#0c0e16"/>
         </linearGradient>
         <radialGradient id="glowL" cx="0" cy="0" r="0.7">
           <stop offset="0" stop-color="#7c5cff" stop-opacity="0.32"/>
           <stop offset="1" stop-color="#7c5cff" stop-opacity="0"/>
         </radialGradient>
         <radialGradient id="glowR" cx="1" cy="1" r="0.7">
           <stop offset="0" stop-color="#22d3ee" stop-opacity="0.22"/>
           <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
         </radialGradient>
         <linearGradient id="markGrad" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0" stop-color="#7c5cff"/>
           <stop offset="1" stop-color="#22d3ee"/>
         </linearGradient>
       </defs>

       <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
       <rect width="${W}" height="${H}" fill="url(#glowL)"/>
       <rect width="${W}" height="${H}" fill="url(#glowR)"/>

       <!-- Brand mark -->
       <g transform="translate(80,72)">
         <rect width="56" height="56" rx="14" fill="url(#markGrad)"/>
         <text x="28" y="40" text-anchor="middle"
               font-family="Helvetica, Arial, sans-serif"
               font-weight="700" font-size="30" fill="#ffffff">M</text>
         <text x="74" y="38"
               font-family="Helvetica, Arial, sans-serif"
               font-weight="600" font-size="28" fill="#ffffff" letter-spacing="-0.5">
           malakavenu.com
         </text>
       </g>

       <!-- Headline block -->
       <g transform="translate(80,300)">
         <text font-family="Helvetica, Arial, sans-serif"
               font-weight="600" font-size="22"
               fill="#a5b4fc" letter-spacing="4">
           AI &amp; AGENTIC SYSTEMS · FRONTEND ARCHITECT
         </text>
         <text y="80"
               font-family="Helvetica, Arial, sans-serif"
               font-weight="700" font-size="62" fill="#ffffff" letter-spacing="-2">
           Malaka Venugopal
         </text>
         <text y="148"
               font-family="Helvetica, Arial, sans-serif"
               font-weight="700" font-size="62" fill="#ffffff" letter-spacing="-2">
           Reddy
         </text>
         <text y="200"
               font-family="Helvetica, Arial, sans-serif"
               font-weight="400" font-size="22" fill="#cdd1de">
           Building agent skills, subagents &amp; MCP servers —
         </text>
         <text y="232"
               font-family="Helvetica, Arial, sans-serif"
               font-weight="400" font-size="22" fill="#cdd1de">
           woven into production frontends.
         </text>
       </g>

       <!-- Footer -->
       <g transform="translate(80,562)" fill="#8a93a6"
          font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="500">
         <text>Bangalore · India  ·  linkedin.com/in/venumalaka</text>
       </g>
     </svg>`,
  );

  await sharp(bg)
    .composite([{ input: fadedPhoto, left: W - PHOTO_W, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
