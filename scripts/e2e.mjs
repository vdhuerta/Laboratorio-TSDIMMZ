// Prueba E2E: juega las tres situaciones del Laboratorio con un navegador real y descarga el reporte.
import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/e2e-lab';
fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text()));
await page.goto(process.env.URL || 'http://localhost:4173');
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const wait = (ms) => page.waitForTimeout(ms);

let cur = null;
async function put(len, lane, pause = 0) {
  if (cur !== len) { await page.click(`[data-testid="rod-${len}"]`); cur = len; }
  await page.click(`[data-testid="lane-${lane}"]`, { position: { x: 8, y: 8 } });
  await wait(pause || 120);
  const n = await page.locator(`[data-testid="count-${len}"]`).textContent(); if (n === '0') cur = null;
}
async function unselect() { if (cur !== null) { await page.click(`[data-testid="rod-${cur}"]`); cur = null; } }
const removeFrom = async (lane, len) => { await unselect(); try { await page.locator(`[data-testid="lane-${lane}"] [data-testid="placed-rod"][data-length="${len}"]`).last().click({ timeout: 4000 }); } catch (e) { await shot('ERR-remove'); throw e; } await wait(150); };
async function dragRod(len, lane) {
  const a = await page.locator(`[data-testid="rod-${len}"]`).boundingBox(); const b = await page.locator(`[data-testid="lane-${lane}"]`).boundingBox();
  await page.mouse.move(a.x + 6, a.y + 8); await page.mouse.down(); await page.mouse.move(a.x + 30, a.y + 20, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 }); await page.mouse.up(); await wait(300);
}
const lanesOk = async () => page.locator('[data-testid^="lane-"][data-correct="1"]').count();
const type = async (sel, text) => { await page.fill(sel, text); await page.locator(sel).blur(); await wait(1500); };

// ── Intro e instrucciones
await page.waitForSelector('[data-testid="btn-start"]'); await shot('01-intro');
await page.click('[data-testid="btn-start"]'); await wait(3300); await shot('02-instrucciones');
await page.click('[data-testid="btn-close-instructions"]'); await wait(200);

// ── TSD 1 · El Volantín
await dragRod(1, 0);                       // arrastre real con el mouse
const dragged = await lanesOk();
await unselect();
await put(3, 1, 1500);                     // lane 1 necesita 2: el 3 excede la meta (error)
await page.click('[data-testid="btn-devolution-construction"]'); await wait(200);
const devSit = await page.textContent('[data-testid="dev-situation"]');
await page.click('[data-testid="btn-construction-devolution"]'); await wait(150);
await page.click('[data-testid="btn-construction-devolution"]'); await wait(150);
const devTexts = await page.locator('[data-testid="devolution-text"]').count();
await page.keyboard.press('Escape'); await wait(200);
if (await page.locator('[data-testid="construction-devolution"]').count()) await page.mouse.click(5, 5);
await wait(200);
await page.click('[data-testid="btn-eye"]'); await wait(200);
const redOutline = await page.locator('[data-testid="lane-1"]').evaluate((e) => e.className.includes('border-rose-500'));
await shot('03d-ojo-rojo'); await page.click('[data-testid="btn-eye"]'); await wait(200);
await removeFrom(1, 3); await wait(1400);  // corrección tras la devolución
await put(2, 1, 1400);
for (let i = 2; i < 10; i++) await put(i + 1, i, i % 3 === 0 ? 1400 : 200);
await shot('03-tsd1-escalera'); const ok1 = await lanesOk();
const pulse1 = await page.locator('[data-testid="btn-instructions"]').getAttribute('data-prompt');
const pulseCls = await page.locator('[data-testid="btn-instructions"]').evaluate((e) => e.className.includes('pulse-ok'));
await shot('03e-pulso-instrucciones');
await page.click('[data-testid="btn-instructions"]'); await wait(300);
const didPulse = await page.locator('[data-testid="btn-didactic"]').evaluate((e) => e.className.includes('pulse-ok') && !e.disabled);
await shot('03f-pulso-mirada');
await page.click('[data-testid="btn-didactic"]'); await wait(1200);
await page.click('text=Volver a instrucciones'); await wait(300);
await page.click('[data-testid="btn-close-instructions"]'); await wait(300);
const pulseAfter = await page.locator('[data-testid="btn-instructions"]').getAttribute('data-prompt');  // debe seguir en 1: el pulso es permanente
const checksHidden = await page.locator('[data-testid="stairs"] svg.text-emerald-500').count();
const order = await page.locator('[data-deposit]').evaluateAll((els) => els.map((e) => e.getAttribute('data-deposit')).join(','));
await page.click('[data-testid="btn-eye"]'); await wait(200);
const checksShown = await page.locator('[data-testid="stairs"] svg.text-emerald-500').count(); await shot('03b-ojo-activo');
await page.click('[data-testid="btn-eye"]'); await wait(200);
// Experimenta (arrastre real a la mesa) y mensaje
await page.click('[data-testid="btn-experimenta"]'); await wait(200);
{ const a = await page.locator('[data-testid="rod-4"]').boundingBox(); const b = await page.locator('[data-testid="testing-surface"]').boundingBox();
  await page.mouse.move(a.x + 6, a.y + 8); await page.mouse.down(); await page.mouse.move(a.x + 40, a.y + 20, { steps: 4 }); await page.mouse.move(b.x + 80, b.y + 60, { steps: 12 }); await page.mouse.up(); await wait(300); }
const testPieces = await page.locator('[data-testid="test-piece"]').count(); await shot('04-experimenta');
await page.click('[data-testid="btn-experimenta"]');
// Globos de bloqueo (TSD 2 y TSD 3) y orden estricto de la Formulación
await page.hover('[data-testid="act-TSD2"]'); await wait(250);
const tipNav = (await page.locator('[data-testid="app-tip"]').filter({ hasText: 'bloqueada' }).first().innerText()).replace(/\s+/g, ' ');
await shot('03c-globo-tsd2');
// Formulación
await page.click('[data-testid="btn-formulation"]'); await wait(300);
const tabs0 = [];
for (let q = 1; q <= 4; q++) tabs0.push(await page.locator(`[data-testid="q-tab-${q}"]`).isDisabled());
await page.locator('[data-testid="q-tab-2"]').locator('..').hover(); await wait(250);
const tipQ = (await page.locator('[data-testid="formulation-panel"] [data-testid="app-tip"]').nth(0).innerText()).replace(/\s+/g, ' ');
await shot('05a-globo-pregunta');
await type('[data-testid="answer-input"]', 'Cada escalón es una unidad más larga que el anterior, siempre crece de uno en uno.');
await page.click('[data-testid="btn-devolution"]'); await wait(200); await shot('05-formulacion');
await type('[data-testid="answer-input"]', 'Cada escalón es una unidad más larga que el anterior, siempre crece de uno en uno, por eso es n+1.');
await page.fill('[data-testid="answer-input"]', 'sí'); await wait(200);   // respuesta mínima: no debe habilitar la P2
const q2Short = await page.locator('[data-testid="q-tab-2"]').isDisabled();
await type('[data-testid="answer-input"]', 'Cada escalón es una unidad más larga que el anterior, siempre crece de uno en uno, por eso es n+1.');
const answers = [
  'La regleta blanca cubre exactamente todas las demás porque cualquier largo es una cantidad de blancas.',
  'Le doy a cada regleta el nombre de la cantidad de blancas que necesito para cubrirla exactamente.',
  'Para pasar al escalón siguiente le agrego una regleta blanca al escalón anterior, en cualquier lugar.'];
for (let q = 2; q <= 4; q++) { await page.click(`[data-testid="q-tab-${q}"]`); await type('[data-testid="answer-input"]', answers[q - 2]); }
await page.keyboard.press('Escape'); await wait(300);

// Bloqueo: TSD3 sin anclaje de TSD2
await page.click('[data-testid="act-TSD3"]'); await wait(300);
const lockShown = await page.locator('[data-testid="btn-lock-action"]').count(); await shot('06-bloqueo');
await page.keyboard.press('Escape'); await wait(200);

// ── TSD 2 · El Puente
await page.click('[data-testid="act-TSD2"]'); await wait(400);
await page.click('[data-testid="btn-close-instructions"]'); cur = null; await wait(200);
await put(6, 0, 1400);
await put(3, 1, 300); await put(3, 1, 1400);
await put(5, 2, 1400); await put(2, 2, 300);            // 5+2 > 6 → rechazada (error)
await removeFrom(2, 5); await wait(1300); await put(4, 2, 1400); await put(2, 2, 300);
await put(1, 3, 300); await put(2, 3, 300); await put(3, 3, 300);
await shot('07-tsd2-puente'); const ok2 = await lanesOk();
await page.click('[data-testid="btn-anchor"]'); await wait(300);
await page.click('[data-testid="btn-anchor-devolution"]'); await wait(200);
await type('[data-testid="bridge-input"]', 'El seis se puede formar con partes distintas: 6, 3+3, 4+2 o 1+2+3; la suma siempre da lo mismo.');
await shot('08-anclaje2'); await page.keyboard.press('Escape'); await wait(300);

// ── TSD 3 · La Cerca
await page.click('[data-testid="act-TSD3"]'); await wait(400);
await page.click('[data-testid="btn-close-instructions"]'); cur = null; await wait(200);
await put(3, 3, 1400); await put(3, 3, 200); await put(3, 3, 200); await put(3, 3, 200);
await put(2, 0, 1400); await put(5, 0, 200); await put(5, 0, 200);
await put(4, 1, 1400); await put(8, 1, 200);
await put(5, 2, 1400); await put(7, 2, 300);             // 12 pero mal compuesto (error)
await removeFrom(2, 7); await wait(1300); await removeFrom(2, 5); await wait(1300);
await put(6, 2, 1400); await put(6, 2, 300);
await shot('09-tsd3-cerca'); const ok3 = await lanesOk();
await page.click('[data-testid="btn-eye"]'); await wait(250);
const fenceGreen = await page.locator('[data-testid="fence"][data-all-correct="1"]').count();
const pillsGreen = await page.locator('[data-testid^="side-L"]').evaluateAll((els) => els.filter((e) => e.className.includes('emerald')).length);
await shot('09b-cerca-ojo-verde');
await removeFrom(2, 6); await wait(300); await put(4, 2, 300); await put(2, 2, 300); await wait(300);
const pillsRed = await page.locator('[data-testid^="side-L"]').evaluateAll((els) => els.filter((e) => e.className.includes('rose')).length);
await shot('09c-cerca-ojo-rojo'); await removeFrom(2, 4); await wait(300); await removeFrom(2, 2); await wait(300); await put(6, 2, 300); await wait(300);
await page.click('[data-testid="btn-eye"]'); await wait(250);
await page.click('[data-testid="btn-anchor"]'); await wait(300);
await type('[data-testid="bridge-input"]', 'Los cuatro lados suman doce de maneras distintas: repetir 3, o combinar 2+5+5, 4+8 y 6+6.');
await page.keyboard.press('Escape'); await wait(300);
await page.click('[data-testid="btn-message"]'); await wait(3300); await shot('10-mensaje');
await page.click('[data-testid="btn-to-report"]'); await wait(500);

// ── Análisis
await shot('11-analisis-resumen');
for (const k of ['DIM1', 'DIM2', 'MARCO', 'TRABAJO']) { await page.click(`[data-testid="atab-${k}"]`); await wait(250); await shot(`12-${k}`); }
const compat = (await page.textContent('[data-testid="compat"]')).replace(/\s+/g, ' ').trim();
await page.click('[data-testid="btn-html"]'); await page.waitForSelector('#pname');
await page.fill('#pname', 'Ana María Pérez');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid="btn-download-now"]')]);
const file = `${OUT}/${dl.suggestedFilename()}`; await dl.saveAs(file);
const [pdf] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), page.getByRole('button', { name: 'PDF' }).click()]);
await pdf.saveAs(`${OUT}/${pdf.suggestedFilename()}`);
const rp = await ctx.newPage(); await rp.setViewportSize({ width: 1100, height: 900 }); await rp.goto('file://' + file); await rp.waitForTimeout(600);
await rp.screenshot({ path: `${OUT}/13-reporte.png`, fullPage: true });
console.log(JSON.stringify({ pulse1, pulseCls, didPulse, pulseAfter, fenceGreen, pillsGreen, pillsRed, tabs0, q2Short, tipNav, tipQ, redOutline, devSit, devTexts, checksHidden, checksShown, order, file, pdf: pdf.suggestedFilename(), dragged, ok1, testPieces, lockShown, ok2, ok3, compat, errors }, null, 1));
await browser.close();
