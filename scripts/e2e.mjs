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
let judgments = 0;
/* IM11: si al colocar el carril llega a su meta aparece «¿Crees que este carril está completo y correcto?»; se responde (Sí por defecto) */
async function judge(answer = 'yes') {
  if (await page.locator('[data-testid="judgment-yes"]').count()) { judgments++; await page.click(`[data-testid="judgment-${answer}"]`); await wait(150); }
}
async function put(len, lane, pause = 0, answer = 'yes') {
  if ((await page.locator(`[data-deposit="${len}"]`).getAttribute('data-selected')) !== '1') await page.click(`[data-testid="rod-${len}"]`);   // estado real del depósito (la selección sobrevive al cambio de puente/casa)
  cur = len;
  await page.click(`[data-testid="lane-${lane}"]`, { position: { x: 8, y: 8 } });
  await wait(pause || 120); await judge(answer);
  const n = await page.locator(`[data-testid="count-${len}"]`).textContent(); if (n === '0') cur = null;
}
async function unselect() { const s = await page.locator('[data-deposit][data-selected="1"]').first().getAttribute('data-deposit').catch(() => null); if (s) await page.click(`[data-testid="rod-${s}"]`); cur = null; }
const removeFrom = async (lane, len) => { await unselect(); try { await page.locator(`[data-testid="lane-${lane}"] [data-testid="placed-rod"][data-length="${len}"]`).last().click({ timeout: 4000 }); } catch (e) { await shot('ERR-remove'); throw e; } await wait(150); };
async function dragRod(len, lane) {
  const a = await page.locator(`[data-testid="rod-${len}"]`).boundingBox(); const b = await page.locator(`[data-testid="lane-${lane}"]`).boundingBox();
  await page.mouse.move(a.x + 6, a.y + 8); await page.mouse.down(); await page.mouse.move(a.x + 30, a.y + 20, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 }); await page.mouse.up(); await wait(300);
}
const lanesOk = async () => page.locator('[data-testid^="lane-"][data-correct="1"]').count();
const type = async (sel, text) => { await page.fill(sel, text); await page.locator(sel).blur(); await wait(1500); };

// ── ayudantes para páginas adicionales (verificación del ojo y de Configuración)
// Metas esperadas de cada forma, de arriba hacia abajo (copia independiente de lo declarado en la app). Al validarse B y C se agregan aquí.
const FORM_METAS = { A: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], B: [4, 9, 2, 7, 10, 1, 6, 3, 8, 5] };
async function freshPage({ form = 'A', target = null, judgment = false } = {}) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(process.env.URL || 'http://localhost:4173'); await p.waitForSelector('[data-testid="btn-start"]'); await p.click('[data-testid="btn-start"]'); await p.waitForTimeout(3300);
  await p.click('[data-testid="btn-close-instructions"]'); await p.waitForTimeout(200);
  await p.click('[data-testid="btn-config"]'); await p.fill('[data-testid="pin-input"]', '4132'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.selectOption('[data-testid="cfg-form"]', form);
  if (target !== null) { await p.fill('[data-testid="cfg-target"]', String(target)); await p.waitForTimeout(150); }
  const on = (await p.locator('[data-testid="cfg-judgment"]').getAttribute('aria-checked')) === 'true';
  if (on !== judgment) await p.click('[data-testid="cfg-judgment"]');
  const opts = await p.locator('[data-testid="cfg-form"] option').evaluateAll((os) => os.map((o) => o.value));
  const targetVal = await p.locator('[data-testid="cfg-target"]').inputValue();
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  return { c, p, errs, opts, targetVal };
}
async function buildLanes(p, plan) {   // plan: [[lane, len], ...]
  for (const [lane, len] of plan) {
    if ((await p.locator(`[data-deposit="${len}"]`).getAttribute('data-selected')) !== '1') await p.click(`[data-testid="rod-${len}"]`);
    await p.click(`[data-testid="lane-${lane}"]`, { position: { x: 8, y: 8 } }); await p.waitForTimeout(90);
  }
}
const flags = (p) => p.locator('[data-testid^="lane-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-correct') === '1'));

// ── Intro e instrucciones
await page.waitForSelector('[data-testid="btn-start"]'); await shot('01-intro');
await page.click('[data-testid="btn-start"]'); await wait(3300); await shot('02-instrucciones');
await page.click('[data-testid="btn-close-instructions"]'); await wait(200);

// ── TSD 1 · El Volantín (10 escalones, cada uno con UNA regleta; las metas son 1..10 declaradas)
const lanes1 = await page.locator('[data-testid^="lane-"]').count();   // debe ser 10
await dragRod(1, 0);                       // arrastre real con el mouse (el carril 0 declara meta 1)
await judge();
const dragged = await page.locator('[data-testid="lane-0"] [data-testid="placed-rod"]').count();
await removeFrom(0, 1); await unselect();
await put(3, 5, 1500, 'no');               // el carril 5 declara meta 6: la regleta 3 NO corresponde y la estudiante cree que NO está correcto
await put(3, 5, 300);                      // una segunda regleta se rechaza: el escalón admite una sola
const secondRejected = (await page.locator('[data-testid="lane-5"] [data-testid="placed-rod"]').count()) === 1;
await page.click('[data-testid="btn-devolution-construction"]'); await wait(200);
const devSit = await page.textContent('[data-testid="dev-situation"]');
await page.click('[data-testid="btn-construction-devolution"]'); await wait(150);
await page.click('[data-testid="btn-construction-devolution"]'); await wait(150);
const devTexts = await page.locator('[data-testid="devolution-text"]').count();
await page.keyboard.press('Escape'); await wait(200);
if (await page.locator('[data-testid="construction-devolution"]').count()) await page.mouse.click(5, 5);
await wait(200);
await page.click('[data-testid="btn-eye"]'); await wait(200);
const redOutline = await page.locator('[data-testid="lane-5"]').evaluate((e) => e.className.includes('border-rose-500'));
await shot('03d-ojo-rojo'); await page.click('[data-testid="btn-eye"]'); await wait(200);
await removeFrom(5, 3); await wait(1400);  // corrección tras la devolución
await put(6, 5, 1400);                     // la regleta 6 corresponde al carril 5 ✓
for (let i = 0; i < 10; i++) { if (i === 5) continue; await put(FORM_METAS.A[i], i, i === 0 ? 1400 : 200); }
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

// ── TSD 2 · El Puente (1 puente de 4 vías; meta 6 por defecto)
await page.click('[data-testid="act-TSD2"]'); await wait(400);
await page.click('[data-testid="btn-close-instructions"]'); cur = null; await wait(200);
const lanes2 = await page.locator('[data-testid^="lane-"]').count();   // 4
await put(6, 0, 1400);
await put(3, 1, 300); await put(3, 1, 1400);
await put(5, 2, 1400); await put(2, 2, 300);            // 5+2 > 6 → rechazada (error)
await removeFrom(2, 5); await wait(1300); await put(4, 2, 1400); await put(2, 2, 300);
await put(1, 3, 300); await put(2, 3, 300); await put(3, 3, 300);
await shot('07-tsd2-puente'); const ok2 = await lanesOk();
await page.click('[data-testid="btn-eye"]'); await wait(250);
const bridgeChecks = await page.locator('[data-testid="bridge"] svg.text-emerald-500').count();   // ojo en TSD2: cuatro vías validadas
await shot('07b-tsd2-ojo'); await page.click('[data-testid="btn-eye"]'); await wait(250);
await page.click('[data-testid="btn-anchor"]'); await wait(300);
await page.click('[data-testid="btn-anchor-devolution"]'); await wait(200);
await type('[data-testid="bridge-input"]', 'El seis se puede formar con partes distintas: 6, 3+3, 4+2 o 1+2+3; la suma siempre da lo mismo.');
await shot('08-anclaje2'); await page.keyboard.press('Escape'); await wait(300);

// ── TSD 3 · La Cerca (1 cerca de 4 lados, perímetro 12; cada lado con su pista)
await page.click('[data-testid="act-TSD3"]'); await wait(400);
await page.click('[data-testid="btn-close-instructions"]'); cur = null; await wait(200);
// forma A: L1 «2 veces 6» [6,6] (carril 3) · L2 «3n+3» [3,3,3,3] (carril 0) · L3 «doble de 1 más 10» [1,1,10] (carril 1) · L4 «dos números que se diferencian en 2» [5,7] (carril 2)
await put(6, 3, 1400); await put(6, 3, 200);
for (let k = 0; k < 4; k++) await put(3, 0, k ? 200 : 1400);
await put(10, 1, 1400); await put(2, 1, 200);          // «doble de 1 más 10» = 2 + 10: una regleta de 2 (la lectura {1,1,10} también valida)
await put(6, 2, 1400); await put(6, 2, 300);             // 6+6 = 12 pero NO es la pista (5 y 7): error de conversión, la suma coincide
const wrongComp = await page.locator('[data-testid="lane-2"]').evaluate((e) => e.getAttribute('data-correct') === '0');
await removeFrom(2, 6); await wait(1300); await removeFrom(2, 6); await wait(1300);
await put(5, 2, 1400); await put(7, 2, 300);
await shot('09-tsd3-cerca'); const ok3 = await lanesOk();
await page.click('[data-testid="btn-eye"]'); await wait(250);
const fenceGreen = await page.locator('[data-testid="fence"][data-all-correct="1"]').count();
const pillsGreen = await page.locator('[data-testid^="side-L"]').evaluateAll((els) => els.filter((e) => e.className.includes('emerald')).length);
await shot('09b-cerca-ojo-verde');
await removeFrom(2, 7); await wait(300); await removeFrom(2, 5); await wait(300); await put(6, 2, 300); await put(6, 2, 300); await wait(300);
const pillsRed = await page.locator('[data-testid^="side-L"]').evaluateAll((els) => els.filter((e) => e.className.includes('rose')).length);
await shot('09c-cerca-ojo-rojo'); await removeFrom(2, 6); await wait(300); await removeFrom(2, 6); await wait(300); await put(5, 2, 300); await put(7, 2, 300); await wait(300);
await page.click('[data-testid="btn-eye"]'); await wait(250);
await page.click('[data-testid="btn-anchor"]'); await wait(300);
await type('[data-testid="bridge-input"]', 'Los cuatro lados suman doce de maneras distintas: repetir 6, juntar cuatro 3, un doble más una parte o dos números que se diferencian.');
await page.keyboard.press('Escape'); await wait(300);
await page.click('[data-testid="btn-message"]'); await wait(3300); await shot('10-mensaje');
await page.click('[data-testid="btn-to-report"]'); await wait(500);

// ── Análisis
await shot('11-analisis-resumen');
console.log('ERRS', JSON.stringify(errors)); await shot('11b-pre-tabs');
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
// ── Lo que el Diario leería + el bloque 4.1
const html = fs.readFileSync(file, 'utf8');
const pay = JSON.parse(/<script id="bct-report-payload"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1]);
const rawT = JSON.parse(/<script id="tsd-report-raw-data"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1]);
const rep = { schema: pay.schema_version, compat: pay.compat_schema, ids: pay.indicators.map((i) => i.code + '=' + i.value).join(' '), im11: pay.immz41.im11, immz41: { ...pay.immz41, im11: undefined }, session: { form_id: pay.form_id, content_level: pay.content_level, content_id: pay.content_id, forms: pay.forms === undefined }, session_form: pay.session_form, opportunity_target: pay.opportunity_target, engine: pay.engine_version, events: rawT.canonical_events.reduce((m, e) => ({ ...m, [e.type]: (m[e.type] || 0) + 1 }), {}), formulation: pay.formulation.map((f) => [f.pregunta, f.correcta, f.caracteres, f.palabras]), anchors: pay.anchors.map((f) => [f.actividad, f.correcta]), jumps: rawT.phase_jumps };

// ── VERIFICACIÓN DEL OJO por forma: TSD1 contra la meta DECLARADA de cada escalón, no contra su posición
const eye = {};
for (const form of Object.keys(FORM_METAS)) {
  const metas = FORM_METAS[form];
  { const { c, p, errs, opts } = await freshPage({ form });
    await buildLanes(p, metas.map((m, i) => [i, m]));
    await p.click('[data-testid="btn-eye"]'); await p.waitForTimeout(300);
    const f = await flags(p); const checks = await p.locator('[data-testid="stairs"] svg.text-emerald-500').count();
    const labels = await p.locator('[data-testid^="lane-"]').evaluateAll((els) => els.map((e) => e.getAttribute('title')));
    await p.screenshot({ path: `${OUT}/15-ojo-${form}-meta-declarada.png` });
    eye[form] = { opciones: opts, declarada: { validan: f.filter(Boolean).length, checks }, labels, errs };
    await c.close(); }
  // contra-pruebas: el total derivado de la posición (i+1) o del rótulo (10−i) solo valida donde coincide con la meta declarada
  for (const [nombre, fn] of [['porPosicion', (i) => i + 1], ['porRotulo', (i) => 10 - i]]) {
    const { c, p } = await freshPage({ form });
    await buildLanes(p, metas.map((_, i) => [i, fn(i)]));
    await p.click('[data-testid="btn-eye"]'); await p.waitForTimeout(300);
    const f = await flags(p); const esperado = metas.filter((m, i) => m === fn(i)).length;
    eye[form][nombre] = { validan: f.filter(Boolean).length, esperado, ok: f.filter(Boolean).length === esperado };
    await c.close(); }
  // combinar NO valida (una sola regleta por escalón): carril de meta 6 con 3 + 3 → la segunda se rechaza y queda marcado
  { const { c, p } = await freshPage({ form });
    const i6 = metas.indexOf(6); await buildLanes(p, [[i6, 3], [i6, 3]]);
    const f = await flags(p); const placed = await p.locator(`[data-testid="lane-${i6}"] [data-testid="placed-rod"]`).count();
    eye[form].combinar = { validaLaMeta6: f[i6], piezasEnElCarril: placed }; await c.close(); }
}

// ── Configuración: selector de la meta del puente (solo 5–7)
const cfgT = {};
for (const t of [5, 7, 9]) { const { c, p, targetVal } = await freshPage({ target: t }); cfgT[t] = targetVal; await c.close(); }
// con meta 7: el puente se arma con una regleta 7 en la vía 0 (la sesión empieza en TSD 1; se va a TSD 2 sin bloqueo? no: se comprueba el valor guardado)
console.log(JSON.stringify({ pulse1, pulseCls, didPulse, pulseAfter, fenceGreen, pillsGreen, pillsRed, wrongComp, tabs0, q2Short, tipNav, tipQ, redOutline, devSit, devTexts, checksHidden, checksShown, order, file, pdf: pdf.suggestedFilename(), dragged, secondRejected, bridgeChecks, ok1, judgments, lanes1, lanes2, eye, cfgT, rep, testPieces, lockShown, ok2, ok3, compat, errors }, null, 1));
await browser.close();
