// Verifica el selector de forma: juega una sesión en la Forma pedida (o la A por defecto si no
// se selecciona nada) y descarga el reporte HTML para inspeccionar el payload.
import { chromium } from 'playwright-core';
import fs from 'fs';

const FORMA = process.argv[2] || 'A'; // 'A' (default, sin tocar el selector) | 'B' | 'C'
const OUT = process.argv[3] || '/tmp/forma-out'; fs.mkdirSync(OUT, { recursive: true });

const src = fs.readFileSync('src/data/cards.ts', 'utf8');
function extractCards(constName) {
  const re = new RegExp(constName + ': Card\\[\\] = \\[([\\s\\S]*?)\\n\\];');
  const body = src.match(re)[1];
  const objs = body.split(/\n  \{/).slice(1).map((s) => '{' + s);
  return objs.map((o) => ({ id: o.match(/id: '([a-z0-9]+)'/)[1], phase: o.match(/correctPhase: TSDPhase\.(\w+)/)[1].toLowerCase() }));
}
const constName = FORMA === 'A' ? 'FORMA_A_CARDS' : FORMA === 'B' ? 'FORMA_B_CARDS' : 'FORMA_C_CARDS';
const cards = extractCards(constName);
console.log(`Forma ${FORMA}: ${cards.length} tarjetas leídas de cards.ts`);

const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(process.env.URL || 'http://localhost:4173');
await page.waitForSelector('[data-zone="available"]');

if (FORMA !== 'A') {
  // Abrir Configuración (admin) y cambiar la forma.
  await page.click('[title="Configuración"]');
  await page.fill('input[type="password"]', '4132');
  await page.click('button:has-text("Verificar clave")');
  await page.waitForSelector('#forma');
  await page.selectOption('#forma', FORMA);
  await page.waitForTimeout(200);
  // Cerrar el modal (clic fuera / botón X) — buscamos el botón de cerrar sesión admin o Escape.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

async function drag(id, zone) {
  const el = page.locator(`[data-card-id="${id}"]`).first(); await el.scrollIntoViewIfNeeded(); const a = await el.boundingBox();
  const dz = page.locator(`[data-zone="${zone}"]`); await dz.scrollIntoViewIfNeeded(); const b = await dz.boundingBox();
  await page.mouse.move(a.x + 40, a.y + 20); await page.mouse.down(); await page.mouse.move(a.x + 60, a.y + 40, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(150);
}

async function answerJudgmentIfOpen() {
  const dialog = page.locator('[role="dialog"]').filter({ hasText: 'fase correcta' });
  if (await dialog.isVisible().catch(() => false)) { await dialog.getByRole('button', { name: 'Sí', exact: true }).click(); await page.waitForTimeout(100); }
}

for (const { id, phase } of cards) { await drag(id, phase); await answerJudgmentIfOpen(); }

const remaining = await page.textContent('[data-testid="remaining"]');
await page.click('[data-testid="tab-analysis"]');
await page.waitForTimeout(300);
await page.click('[data-testid="btn-html"]');
await page.fill('#pname', 'Ana María Pérez');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByText('Descarga ahora').click()]);
const file = `${OUT}/${dl.suggestedFilename()}`;
await dl.saveAs(file);
console.log(JSON.stringify({ forma: FORMA, file, remaining, errs }, null, 1));
await browser.close();
