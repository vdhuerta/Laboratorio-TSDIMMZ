// Prueba E2E: juega el simulador con un navegador real y descarga el reporte.
import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/e2e';
fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(process.env.URL || 'http://localhost:4173');
await page.waitForSelector('[data-zone="available"]');

async function drag(id, zone) {
  const src = page.locator(`[data-card-id="${id}"]`).first();
  await src.scrollIntoViewIfNeeded();
  const a = await src.boundingBox();
  const dz = page.locator(`[data-zone="${zone}"]`); await dz.scrollIntoViewIfNeeded();
  const b = await dz.boundingBox();
  await page.mouse.move(a.x + 40, a.y + 20); await page.mouse.down();
  await page.mouse.move(a.x + 60, a.y + 40, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
  await page.mouse.up(); await page.waitForTimeout(250);
}
const lupa = async (id) => { await page.locator(`[data-card-id="${id}"] [data-analysis-btn]`).click(); await page.waitForTimeout(200); await page.keyboard.press('Escape'); await page.waitForTimeout(150); };

// Guion: mezcla de aciertos, errores, corrección, devolución y una institucionalización prematura.
await drag('c1', 'action'); await page.waitForTimeout(5300);
await drag('c5', 'formulation'); await page.waitForTimeout(5300);      // error
await lupa('c5');
await drag('c5', 'action'); await page.waitForTimeout(5300);            // corrección
await drag('c4', 'institutionalization'); await page.waitForTimeout(5300); // error + prematura
await lupa('c4');
await drag('c2', 'formulation'); await page.waitForTimeout(1000);
await drag('c3', 'validation'); await page.waitForTimeout(5300);
await drag('c13', 'action'); await page.waitForTimeout(500);
await drag('c6', 'formulation');
await page.screenshot({ path: `${OUT}/01-simulador.png` });
await page.click('[data-testid="btn-verify-eye"]'); await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/02-verificando.png` });
const remaining = await page.textContent('[data-testid="remaining"]');

await page.click('[data-testid="tab-analysis"]'); await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/03-analisis-resumen.png` });
for (const k of ['DIM1', 'DIM2', 'MARCO', 'TRABAJO']) { await page.click(`[data-testid="atab-${k}"]`); await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/04-${k}.png` }); }
await page.click('[data-testid="atab-DIM1"]'); await page.locator('[data-im="IM4"] button').click(); await page.waitForTimeout(200);
const compat = await page.textContent('[data-testid="compat"]');

// Descarga sin nombre → pide nombre → descarga
await page.click('[data-testid="btn-html"]'); await page.waitForSelector('#pname');
await page.screenshot({ path: `${OUT}/03b-nombre.png` });
await page.fill('#pname', 'Ana María Pérez');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByText('Descarga Ahora').click()]);
const file = `${OUT}/${dl.suggestedFilename()}`; await dl.saveAs(file);
// PDF
const [pdf] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF' }).click()]);
await pdf.saveAs(`${OUT}/${pdf.suggestedFilename()}`);

// Reporte renderizado
const rp = await ctx.newPage(); await rp.goto('file://' + file); await rp.waitForTimeout(500);
await rp.screenshot({ path: `${OUT}/05-reporte.png`, fullPage: true });
console.log(JSON.stringify({ file, pdf: pdf.suggestedFilename(), remaining, compat: compat.replace(/\s+/g, ' ').trim(), errors }, null, 1));
await browser.close();
