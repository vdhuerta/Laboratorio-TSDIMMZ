import { chromium } from 'playwright-core'; import fs from 'fs';
const b = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const svg = fs.readFileSync('public/icon.svg', 'utf8');
for (const s of [32, 180, 512]) { const p = await b.newPage({ viewport: { width: s, height: s } }); await p.setContent(`<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width=${s} height=${s}>`); await p.screenshot({ path: s === 32 ? 'public/favicon-32.png' : s === 180 ? 'public/apple-touch-icon.png' : 'public/icon-512.png', omitBackground: true }); }
await b.close();
// ICO envolviendo el PNG de 32
const png = fs.readFileSync('public/favicon-32.png'); const h = Buffer.alloc(22); h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4); h[6] = 32; h[7] = 32; h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12); h.writeUInt32LE(png.length, 14); h.writeUInt32LE(22, 18);
fs.writeFileSync('public/favicon.ico', Buffer.concat([h, png]));
