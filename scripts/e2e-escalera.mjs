/* Escalera (igual en A, B y C) armada como lo hace la estudiante: de ABAJO hacia ARRIBA, de la regleta 10 a la 1. Uso: node scripts/e2e-escalera.mjs */
import { chromium } from 'playwright-core';
const exe = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(process.env.URL || 'http://localhost:4173');
await p.fill('[data-testid="id-nrc"]', '12345'); await p.selectOption('[data-testid="id-form"]', process.env.FORM || 'A'); await p.click('[data-testid="id-submit"]');
await p.click('[data-testid="btn-start"]'); await p.waitForTimeout(3300); await p.click('[data-testid="btn-close-instructions"]'); await p.waitForTimeout(200);
const n = await p.locator('[data-testid^="lane-"]').count();   // carril 0 = arriba, carril 9 = abajo
for (let k = 0; k < 10; k++) {   // k=0: el escalón de abajo (carril 9) con la regleta 10 … k=9: el de arriba (carril 0) con la 1
  const len = 10 - k, lane = 9 - k;
  if ((await p.locator(`[data-deposit="${len}"]`).getAttribute('data-selected')) !== '1') await p.click(`[data-testid="rod-${len}"]`);
  await p.click(`[data-testid="lane-${lane}"]`, { position: { x: 8, y: 8 } }); await p.waitForTimeout(150);
  if (await p.locator('[data-testid="judgment-yes"]').count()) { await p.click('[data-testid="judgment-yes"]'); await p.waitForTimeout(100); }
}
const flags = await p.locator('[data-testid^="lane-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-correct') === '1'));
await p.click('[data-testid="btn-eye"]'); await p.waitForTimeout(300);
const checks = await p.locator('[data-testid="stairs"] svg.text-emerald-500').count();
const reds = await p.locator('[data-testid^="lane-"]').evaluateAll((els) => els.filter((e) => e.className.includes('border-rose-500')).length);
await p.click('[data-testid="btn-eye"]');
await p.click('[data-testid="btn-formulation"]').catch(() => {}); await p.waitForTimeout(400);
const q2 = await p.locator('[data-testid="q-tab-1"]').count();
await p.screenshot({ path: '/tmp/e2e-lab/escalera-' + (process.env.FORM || 'A') + '.png' });
console.log(JSON.stringify({ carriles: n, correctos: flags.filter(Boolean).length, ojoVerdes: checks, ojoRojos: reds, formulacionAbre: q2 > 0, errs }));
await b.close();
