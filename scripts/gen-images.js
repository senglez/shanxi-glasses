// Generates placeholder product art, OG image, logo and favicon.
// Replace them with real product photos in the admin panel when available.
// Usage: node scripts/gen-images.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'img');
fs.mkdirSync(path.join(OUT, 'glass'), { recursive: true });

// Each shape: glass outline path, extra parts, optional liquid {y, color}
const shapes = {
  wine: {
    hue: '#b3263a',
    glass: 'M215 110 C205 235 228 305 300 322 C372 305 395 235 385 110 Z',
    parts: '<rect x="294" y="320" width="12" height="150" rx="5"/><ellipse cx="300" cy="476" rx="88" ry="13"/>',
    liquid: { y: 235, color: '#7a0f22' },
  },
  flute: {
    hue: '#d9a441',
    glass: 'M262 80 C254 220 268 302 300 332 C332 302 346 220 338 80 Z',
    parts: '<rect x="295" y="330" width="10" height="140" rx="4"/><ellipse cx="300" cy="474" rx="72" ry="11"/>',
    liquid: { y: 140, color: '#e7c063' },
    rim: { x1: 262, x2: 338, y: 80, color: '#e9c46a' },
  },
  goblet: {
    hue: '#2a9d8f',
    glass: 'M195 150 C195 262 238 322 300 326 C362 322 405 262 405 150 Z',
    parts: '<rect x="292" y="324" width="16" height="118" rx="6"/><ellipse cx="300" cy="372" rx="22" ry="10"/><ellipse cx="300" cy="474" rx="96" ry="14"/>',
    tint: '#3fb8a5',
  },
  tumbler: {
    hue: '#c97a2b',
    glass: 'M195 190 L212 468 Q214 486 234 486 L366 486 Q386 486 388 468 L405 190 Z',
    parts: '<rect x="216" y="436" width="168" height="44" rx="10" opacity=".55"/>',
    liquid: { y: 340, color: '#b8651b' },
  },
  ribbed: {
    hue: '#5e60ce',
    glass: 'M222 100 L230 482 L370 482 L378 100 Z',
    parts: Array.from({ length: 8 }, (_, i) => `<line x1="${240 + i * 17}" y1="110" x2="${244 + i * 16}" y2="472" stroke-width="3" opacity=".5"/>`).join(''),
  },
  teapot: {
    hue: '#e76f51',
    glass: 'M175 300 C175 210 240 190 300 190 C360 190 425 210 425 300 C425 400 380 462 300 462 C220 462 175 400 175 300 Z',
    parts:
      '<path d="M425 270 C500 260 515 360 430 400" fill="none" stroke-width="14"/><path d="M180 300 C130 290 110 250 95 220 L120 210 C140 245 160 265 185 270" /><rect x="250" y="160" width="100" height="34" rx="12"/><rect x="270" y="196" width="60" height="150" rx="14" opacity=".55"/>',
    liquid: { y: 320, color: '#c9672a' },
  },
  double: {
    hue: '#6d4c41',
    glass: 'M195 190 L208 440 Q300 485 392 440 L405 190 Z',
    parts: '<path d="M225 200 L236 410 Q300 440 364 410 L375 200" fill="none" stroke-width="3" opacity=".7"/>',
    liquid: { y: 260, color: '#5a3825', clip: 'M225 200 L236 410 Q300 440 364 410 L375 200 Z' },
  },
  vase: {
    hue: '#3a86ff',
    glass: 'M262 100 L338 100 L333 150 C440 225 440 405 362 486 L238 486 C160 405 160 225 267 150 Z',
    tint: '#4f8dfd',
    ombre: true,
  },
  bowl: {
    hue: '#00b4d8',
    glass: 'M215 175 C120 230 120 420 220 470 C270 495 330 495 380 470 C480 420 480 230 385 175 Z',
    parts: '<ellipse cx="300" cy="176" rx="86" ry="14" fill="none" stroke-width="4"/>',
    liquid: { y: 360, color: '#4cc9f0' },
  },
  candle: {
    hue: '#f4a261',
    glass: 'M205 220 L205 472 Q205 488 222 488 L378 488 Q395 488 395 472 L395 220 Z',
    parts: '<line x1="300" y1="300" x2="300" y2="268" stroke="#222" stroke-width="4"/>',
    liquid: { y: 300, color: '#f1e3c8' },
    flame: { x: 300, y: 240 },
  },
  votive: {
    hue: '#c0c0c0',
    glass: 'M220 260 L232 472 Q234 488 252 488 L348 488 Q366 488 368 472 L380 260 Z',
    metal: true,
    flame: { x: 300, y: 228 },
  },
  decanter: {
    hue: '#9d0208',
    glass: 'M282 85 L318 85 L316 215 C330 280 470 350 452 440 Q444 484 400 486 L200 486 Q156 484 148 440 C130 350 270 280 284 215 Z',
    liquid: { y: 400, color: '#6a040f' },
  },
  jar: {
    hue: '#a7c957',
    glass: 'M200 215 Q200 200 215 200 L385 200 Q400 200 400 215 L400 470 Q400 488 382 488 L218 488 Q200 488 200 470 Z',
    parts: '<rect x="192" y="152" width="216" height="52" rx="12" fill="#c8a165" stroke="#8a6a3a" stroke-width="2"/>',
    liquid: { y: 330, color: '#8d6e4a' },
  },
  // Perfume & cosmetic packaging
  perfume: {
    hue: '#e0aaff',
    glass: 'M205 230 Q205 210 225 210 L375 210 Q395 210 395 230 L395 465 Q395 488 372 488 L228 488 Q205 488 205 465 Z',
    parts: '<rect x="222" y="430" width="156" height="50" rx="10" opacity=".55"/><rect x="282" y="178" width="36" height="34" rx="4"/><rect x="250" y="96" width="100" height="84" rx="14" fill="#d4af37" stroke="#8a6d1d" stroke-width="2"/>',
    liquid: { y: 300, color: '#f3d1ff' },
  },
  bubble: {
    hue: '#4cc9f0',
    glass: 'M300 205 C390 205 430 280 430 350 C430 430 375 488 300 488 C225 488 170 430 170 350 C170 280 210 205 300 205 Z',
    parts:
      '<rect x="283" y="172" width="34" height="36" rx="4"/><path d="M262 100 L338 100 L330 176 L270 176 Z" fill="#c0c0c0" stroke="#666" stroke-width="2"/>' +
      [[250, 300, 9], [330, 270, 6], [360, 380, 11], [230, 410, 7], [300, 440, 5], [270, 350, 4], [345, 330, 4], [205, 340, 5]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke-width="1.8" opacity=".9"/>`).join(''),
    tint: '#9be7ff',
  },
  facet: {
    hue: '#ffd166',
    glass: 'M300 205 L405 270 L405 420 L300 488 L195 420 L195 270 Z',
    parts:
      '<path d="M300 205 L300 488 M195 270 L405 420 M405 270 L195 420" fill="none" stroke-width="1.5" opacity=".6"/>' +
      '<rect x="284" y="170" width="32" height="36" rx="4"/><path d="M300 92 L352 132 L300 172 L248 132 Z" fill="#ffe9a8" stroke="#b8902a" stroke-width="2"/>',
    tint: '#ffe08a',
  },
  spray: {
    hue: '#f72585',
    glass: 'M235 210 L365 210 Q400 210 400 245 L400 455 Q400 488 367 488 L233 488 Q200 488 200 455 L200 245 Q200 210 235 210 Z',
    parts: '<rect x="283" y="178" width="34" height="34" rx="4"/><rect x="258" y="104" width="84" height="76" rx="38" fill="#111" stroke="#555" stroke-width="2"/>',
    ombre: true,
    tint: '#f72585',
  },
  dropper: {
    hue: '#2ec4b6',
    glass: 'M240 255 Q240 235 260 235 L340 235 Q360 235 360 255 L360 470 Q360 488 342 488 L258 488 Q240 488 240 470 Z',
    parts: '<rect x="268" y="196" width="64" height="42" rx="6" fill="#d4af37" stroke="#8a6d1d" stroke-width="2"/><path d="M276 196 Q276 120 300 112 Q324 120 324 196 Z" fill="#222" stroke="#555" stroke-width="2"/><line x1="300" y1="238" x2="300" y2="430" stroke-width="5" opacity=".6"/>',
    liquid: { y: 330, color: '#b7efe8' },
    metal: false,
    tint: '#cfeee9',
  },
  pump: {
    hue: '#90be6d',
    glass: 'M220 250 Q220 225 245 225 L355 225 Q380 225 380 250 L380 465 Q380 488 357 488 L243 488 Q220 488 220 465 Z',
    parts: '<rect x="270" y="190" width="60" height="38" rx="6" fill="#e9e9e9" stroke="#888" stroke-width="2"/><rect x="292" y="132" width="16" height="60" fill="#e9e9e9" stroke="#888" stroke-width="2"/><path d="M280 122 L368 122 Q378 122 378 132 L378 140 L280 140 Z" fill="#e9e9e9" stroke="#888" stroke-width="2"/>',
    ombre: true,
    tint: '#90be6d',
  },
  creamjar: {
    hue: '#cdb4db',
    glass: 'M185 300 Q185 280 205 280 L395 280 Q415 280 415 300 L415 455 Q415 488 382 488 L218 488 Q185 488 185 455 Z',
    parts: '<rect x="178" y="226" width="244" height="58" rx="12" fill="#d4af37" stroke="#8a6d1d" stroke-width="2"/><rect x="200" y="300" width="200" height="40" rx="8" opacity=".5"/>',
    liquid: { y: 360, color: '#fbeff9' },
    tint: '#e9d5ff',
  },
  diffuser: {
    hue: '#a98467',
    glass: 'M262 240 L338 240 L338 280 Q410 300 410 380 L410 455 Q410 488 377 488 L223 488 Q190 488 190 455 L190 380 Q190 300 262 280 Z',
    parts:
      '<rect x="270" y="215" width="60" height="28" rx="5" fill="#2b2b2b" stroke="#555" stroke-width="2"/>' +
      [[-60, 70], [-30, 82], [0, 90], [28, 84], [58, 72]].map(([dx, h], i) => `<line x1="${300 + i * 4 - 8}" y1="230" x2="${300 + dx}" y2="${230 - h - 40}" stroke="#c9a66b" stroke-width="4" stroke-linecap="round"/>`).join(''),
    liquid: { y: 360, color: '#d9a066' },
  },
  bottle: {
    hue: '#06d6a0',
    glass: 'M265 130 L335 130 L335 175 Q392 195 392 255 L392 462 Q392 488 366 488 L234 488 Q208 488 208 462 L208 255 Q208 195 265 175 Z',
    parts: '<rect x="258" y="86" width="84" height="50" rx="10" fill="#c8a165" stroke="#8a6a3a" stroke-width="2"/><rect x="208" y="300" width="184" height="120" rx="6" fill="#0f766e" opacity=".55"/>',
  },
};

function svgFor(name, s, w = 1200, h = 1200) {
  const id = name;
  const liquid = s.liquid
    ? `<clipPath id="c-${id}"><path d="${s.liquid.clip || s.glass}"/></clipPath>
       <g clip-path="url(#c-${id})"><rect x="0" y="${s.liquid.y}" width="600" height="600" fill="${s.liquid.color}" opacity=".85"/>
       <rect x="0" y="${s.liquid.y}" width="600" height="6" fill="#fff" opacity=".25"/></g>`
    : '';
  const fill = s.metal ? `url(#metal-${id})` : s.ombre ? `url(#ombre-${id})` : `url(#glass-${id})`;
  const flame = s.flame
    ? `<g><circle cx="${s.flame.x}" cy="${s.flame.y}" r="60" fill="url(#flame-${id})"/><path d="M${s.flame.x} ${s.flame.y - 34} C${s.flame.x + 16} ${s.flame.y - 6} ${s.flame.x + 14} ${s.flame.y + 24} ${s.flame.x} ${s.flame.y + 28} C${s.flame.x - 14} ${s.flame.y + 24} ${s.flame.x - 16} ${s.flame.y - 6} ${s.flame.x} ${s.flame.y - 34} Z" fill="#ffd166"/></g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1020"/><stop offset="1" stop-color="#05070d"/></linearGradient>
    <radialGradient id="glow-${id}" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="${s.hue}" stop-opacity=".55"/><stop offset="1" stop-color="${s.hue}" stop-opacity="0"/></radialGradient>
    <linearGradient id="glass-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${s.tint || '#ffffff'}" stop-opacity=".28"/><stop offset=".35" stop-color="#ffffff" stop-opacity=".06"/><stop offset=".7" stop-color="#ffffff" stop-opacity=".12"/><stop offset="1" stop-color="${s.tint || '#ffffff'}" stop-opacity=".3"/></linearGradient>
    <linearGradient id="ombre-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".1"/><stop offset="1" stop-color="${s.tint || s.hue}" stop-opacity=".85"/></linearGradient>
    <linearGradient id="metal-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5f5f5"/><stop offset=".3" stop-color="#8d8d8d"/><stop offset=".55" stop-color="#e9e9e9"/><stop offset="1" stop-color="#5c5c5c"/></linearGradient>
    <radialGradient id="flame-${id}"><stop offset="0" stop-color="#ffb703" stop-opacity=".8"/><stop offset="1" stop-color="#ffb703" stop-opacity="0"/></radialGradient>
    <linearGradient id="shine-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg-${id})"/>
  <circle cx="300" cy="330" r="300" fill="url(#glow-${id})"/>
  <ellipse cx="300" cy="500" rx="190" ry="18" fill="#000" opacity=".5"/>
  ${liquid}
  <g fill="${fill}" stroke="#ffffff" stroke-opacity=".75" stroke-width="2.5">
    <path d="${s.glass}"/>
    ${s.parts || ''}
  </g>
  ${s.rim ? `<line x1="${s.rim.x1}" y1="${s.rim.y}" x2="${s.rim.x2}" y2="${s.rim.y}" stroke="${s.rim.color}" stroke-width="7" stroke-linecap="round"/>` : ''}
  <path d="${s.glass}" fill="none" stroke="url(#shine-${id})" stroke-width="1" transform="translate(-6 0) scale(1)" opacity=".5"/>
  <rect x="${parseInt(s.glass.split(' ')[0].slice(1), 10) + 18}" y="140" width="10" height="160" rx="5" fill="url(#shine-${id})" opacity=".45"/>
  ${flame}
</svg>`;
}

async function main() {
  for (const [name, s] of Object.entries(shapes)) {
    await sharp(Buffer.from(svgFor(name, s, 1000, 1000))).webp({ quality: 82 }).toFile(path.join(OUT, 'glass', name + '.webp'));
  }

  // Open Graph image 1200x630
  const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1020"/><stop offset="1" stop-color="#05070d"/></linearGradient>
    <radialGradient id="a" cx=".8" cy=".4" r=".6"><stop offset="0" stop-color="#ff9e3d" stop-opacity=".7"/><stop offset="1" stop-color="#ff9e3d" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx=".95" cy=".9" r=".5"><stop offset="0" stop-color="#3ee0ff" stop-opacity=".55"/><stop offset="1" stop-color="#3ee0ff" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/><rect width="1200" height="630" fill="url(#a)"/><rect width="1200" height="630" fill="url(#b)"/>
    <text x="80" y="250" font-family="Helvetica, Arial, sans-serif" font-size="68" font-weight="700" fill="#fff">Glassware from Shanxi, China</text>
    <text x="80" y="330" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#cfd8e3">Hand-blown &amp; machine-made · OEM/ODM · QC &amp; export</text>
    <text x="80" y="520" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="#ffb86b">SHANXI GLASSWORKS</text>
  </svg>`;
  await sharp(Buffer.from(og)).png().toFile(path.join(OUT, 'og-default.png'));

  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <defs><linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3ee0ff"/><stop offset="1" stop-color="#ff9e3d"/></linearGradient></defs>
    <rect width="64" height="64" rx="14" fill="#0b1020"/>
    <path d="M20 12 C19 30 24 36 32 38 C40 36 45 30 44 12 Z" fill="none" stroke="url(#l)" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M32 38 V52 M22 53 H42" stroke="url(#l)" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`;
  fs.writeFileSync(path.join(OUT, 'favicon.svg'), logoSvg);
  await sharp(Buffer.from(logoSvg)).resize(512, 512).png().toFile(path.join(OUT, 'logo.png'));
  await sharp(Buffer.from(logoSvg)).resize(180, 180).png().toFile(path.join(OUT, 'apple-touch-icon.png'));
  console.log('images generated in public/img');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
