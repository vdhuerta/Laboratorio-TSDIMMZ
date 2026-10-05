// Prueba visual: mazo vacío, tooltip de la lupa, letra de fase, KPIs de igual ancho y KPIs con iconos; descarga el reporte.
import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/e2e-ui'; fs.mkdirSync(OUT, { recursive: true });
const cards = [...fs.readFileSync('src/data/cards.ts', 'utf8').matchAll(/id: '(c\d+)',[\s\S]*?correctPhase: TSDPhase\.(\w+)/g)].map((m) => [m[1], m[2].toLowerCase()]);
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(process.env.URL || 'http://localhost:4173'); await page.waitForSelector('[data-zone="available"]');
async function drag(id, zone) {
  const src = page.locator(`[data-card-id="${id}"]`).first(); await src.scrollIntoViewIfNeeded(); const a = await src.boundingBox();
  const dz = page.locator(`[data-zone="${zone}"]`); await dz.scrollIntoViewIfNeeded(); const b = await dz.boundingBox();
  await page.mouse.move(a.x + 40, a.y + 20); await page.mouse.down(); await page.mouse.move(a.x + 60, a.y + 40, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(150);
}
for (const [id, ph] of cards) await drag(id, ph);
const remaining = await page.textContent('[data-testid="remaining"]');
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${OUT}/01-mazo-vacio.png` });
const deckBox = await page.locator('[data-testid="deck-empty"]').evaluate((el) => getComputedStyle(el).borderStyle);
const titleW = await page.getByText('Mazo de tarjetas').evaluate((el) => ({ w: getComputedStyle(el).fontWeight, c: getComputedStyle(el).color }));
// tooltip
const lupa = page.locator('[data-card-id="c1"] [data-analysis-btn]').first(); await lupa.scrollIntoViewIfNeeded(); await lupa.hover(); await page.waitForTimeout(300);
const tip = await page.locator('[data-card-id="c1"] [role="tooltip"]').first().evaluate((el) => getComputedStyle(el).opacity);
const zone = page.locator('[data-zone="action"]'); await zone.screenshot({ path: `${OUT}/02-tooltip-lupa.png` });
await lupa.click(); await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/03-devolucion.png` });
const modalTxt = await page.locator('[role="dialog"]').innerText(); await page.keyboard.press('Escape');
// devolver una tarjeta al mazo
await drag('c1', 'available'); const remaining2 = await page.textContent('[data-testid="remaining"]');
// análisis
await page.click('[data-testid="tab-analysis"]'); await page.click('[data-testid="atab-DIM1"]'); await page.waitForTimeout(200);
const widths = await page.locator('[data-kpi="immz"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
await page.locator('[data-testid="dim-a"]').screenshot({ path: `${OUT}/04-dim1-kpis.png` });
await page.click('[data-testid="atab-TRABAJO"]'); await page.waitForTimeout(200); await page.locator('[data-testid="kpis-trabajo"]').screenshot({ path: `${OUT}/05-kpis-trabajo.png` });
await page.click('[data-testid="btn-html"]'); await page.fill('#pname', 'Ana María Pérez');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByText('Descarga ahora').click()]);
const file = `${OUT}/${dl.suggestedFilename()}`; await dl.saveAs(file);
const rp = await ctx.newPage(); await rp.setViewportSize({ width: 1000, height: 900 }); await rp.goto('file://' + file); await rp.waitForTimeout(400);
await rp.screenshot({ path: `${OUT}/06-reporte.png`, fullPage: true });
const rw = await rp.locator('.kpis3 .kpi3').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
const rk = await rp.locator('.kpis5 .kpi5 svg').count();
console.log(JSON.stringify({ file, remaining, remaining2, deckBorder: deckBox, titleStyle: titleW, tooltipOpacityOnHover: tip, modalHasFaseA: /Fase A\b/.test(modalTxt), modalRevealsName: /Acci[oó]n|action/i.test(modalTxt.split('\n').slice(0, 4).join(' ')), kpiWidthsDim1: widths, reportKpiWidths: rw, reportIconCount: rk, errs: errs }, null, 1));
await browser.close();
