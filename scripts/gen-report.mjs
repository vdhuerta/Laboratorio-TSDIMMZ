// Genera un reporte 4.1 real jugando la app (incluye juicios IM11: Sí, No, y uno sin responder;
// y actos de formulación IM10 vía movimientos a la columna Formulación).
import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/immz41-out'; fs.mkdirSync(OUT, { recursive: true });
const cards = [...fs.readFileSync('src/data/cards.ts', 'utf8').matchAll(/id: '(c\d+)',[\s\S]*?correctPhase: TSDPhase\.(\w+)/g)].map((m) => [m[1], m[2].toLowerCase()]);
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(process.env.URL || 'http://localhost:4173');
await page.waitForSelector('[data-zone="available"]');

async function drag(id, zone) {
  const src = page.locator(`[data-card-id="${id}"]`).first(); await src.scrollIntoViewIfNeeded(); const a = await src.boundingBox();
  const dz = page.locator(`[data-zone="${zone}"]`); await dz.scrollIntoViewIfNeeded(); const b = await dz.boundingBox();
  await page.mouse.move(a.x + 40, a.y + 20); await page.mouse.down(); await page.mouse.move(a.x + 60, a.y + 40, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(200);
}

async function answerJudgmentIfOpen(idx) {
  const dialog = page.locator('[role="dialog"]').filter({ hasText: 'fase correcta' });
  const visible = await dialog.isVisible().catch(() => false);
  if (!visible) return;
  if (idx % 5 === 0) {
    await page.keyboard.press('Escape');
  } else {
    const answer = idx % 2 === 0 ? 'Sí' : 'No';
    await dialog.getByRole('button', { name: answer, exact: true }).click();
  }
  await page.waitForTimeout(150);
}

let i = 0, formulationCards = 0;
for (const [id, ph] of cards) {
  await drag(id, ph);
  if (ph === 'formulation') formulationCards++;
  await answerJudgmentIfOpen(i);
  i++;
}

const placedId = cards[0][0];
const lupa = page.locator(`[data-card-id="${placedId}"] [data-analysis-btn]`).first();
await lupa.scrollIntoViewIfNeeded(); await lupa.click(); await page.waitForTimeout(250);
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
// Dos movimientos reales entre fases (el Simulador solo registra 'move' cuando cae en una fase
// TSD, no en 'available') para generar un segundo 'intento' sobre la misma unidad tras la devolución.
const otherPhase = ['action', 'formulation', 'validation', 'institutionalization'].find((p) => p !== cards[0][1]);
await drag(placedId, otherPhase); await answerJudgmentIfOpen(i); i++;
await drag(placedId, cards[0][1]); await answerJudgmentIfOpen(i); i++;

const remaining = await page.textContent('[data-testid="remaining"]');
await page.click('[data-testid="tab-analysis"]');
await page.waitForTimeout(300);
await page.click('[data-testid="btn-html"]');
await page.fill('#pname', 'Ana María Pérez');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByText('Descarga ahora').click()]);
const file = `${OUT}/${dl.suggestedFilename()}`;
await dl.saveAs(file);
console.log(JSON.stringify({ file, remaining, formulationCards, errs }, null, 1));
await browser.close();
