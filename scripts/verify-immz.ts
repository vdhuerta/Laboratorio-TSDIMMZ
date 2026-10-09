/**
 * Verifica que un reporte generado por la app se lea EXACTAMENTE igual en el Diario de Campo.
 * Uso: DIARIO_SRC=/ruta/diario-campo/src npx tsx scripts/verify-immz.ts <Reporte_LabTSD_*.html>
 * Ejecuta el parser, el auditor (R1–R11) y el narrador IMMZ ORIGINALES del Diario.
 */
import fs from 'fs';
import path from 'path';
const src = process.env.DIARIO_SRC;
if (!src) { console.error('Define DIARIO_SRC=/ruta/al/diario-campo/src'); process.exit(2); }
const file = process.argv[2];
const { parseReportText } = await import(path.join(src, 'lib/immz/parser.ts'));
const { auditEntry } = await import(path.join(src, 'lib/audit.ts'));
const { narrateImmz } = await import(path.join(src, 'lib/immzNarrative.ts'));
const { DEFAULT_APP_CONFIGS, INDICATORS } = await import(path.join(src, 'config.ts'));

const html = fs.readFileSync(file, 'utf8');
const name = path.basename(file);
const parsed = parseReportText(html, name);
const payload = JSON.parse(/<script id="bct-report-payload"[^>]*>([\s\S]*?)<\/script>/.exec(html)![1]);
let fail = 0; const ok = (c: boolean, m: string) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) fail++; };

console.log('Lectura con el parser del Diario →', { simulator: parsed.simulator, class: parsed.classNumber, student: parsed.studentName, schema: parsed.sourceVersion, immz: parsed.immz, ao: parsed.immzAO, ac: parsed.immzAC, idcd: parsed.idcd, immg: parsed.immg, cat: parsed.category, apropiacion: parsed.apropiacion, aciertos: parsed.aciertos, errores: parsed.errores, reflexiones: parsed.reflexiones });
console.log('Avisos del parser:', parsed.warnings);
console.log('\n[1] Parser');
ok(parsed.sourceVersion === '4.0', 'esquema 4.0 detectado (sin re-mapeo)');
ok(parsed.simulator === 'Laboratorio TSD', 'APP resuelta = Laboratorio TSD');
ok(parsed.classNumber === payload.class_number, 'clase leída = clase del payload');
ok(parsed.studentName === payload.participant_name && !!parsed.studentName, 'nombre del participante leído');
ok(!parsed.warnings.some((w: string) => /re-mapeados|nombre \(sin código|rescatados|no contiene/.test(w)), 'sin avisos de re-mapeo / rescate / HTML heredado');
for (const d of INDICATORS) {
  const got = parsed.indicators.find((i: any) => i.id === d.id)?.value ?? null;
  const exp = payload.indicators.find((i: any) => i.code === d.id)?.value ?? null;
  ok(got === exp, `${d.id} ${d.label}: Diario=${got} app=${exp}`);
}
for (const [k, pk] of [['immz', 'immz'], ['immzAO', 'immz_ao'], ['immzAC', 'immz_ac'], ['idcd', 'idcd'], ['immg', 'immg']] as const) ok(parsed[k] === payload[pk], `${k}: Diario=${parsed[k]} app=${payload[pk]}`);
ok(parsed.apropiacion === payload.apropiacion && parsed.aciertos === payload.aciertos && parsed.errores === payload.errores && parsed.reflexiones === payload.reflexiones, 'métricas del simulador (apropiación/aciertos/errores/reflexiones)');

console.log('\n[2] Auditor (R1–R11) con la configuración por defecto del Diario');
const good = auditEntry({ classNumber: 9, used_app: 'Laboratorio TSD', appReport: { name, type: 'text/html', data: '' }, appReportParsed: parsed }, DEFAULT_APP_CONFIGS);
ok(good.clean, `Clase 9 + Laboratorio TSD + este archivo → sin discrepancias ${good.clean ? '' : JSON.stringify(good.discrepancies.map((d: any) => d.rule))}`);
const bad = auditEntry({ classNumber: 2, used_app: 'Laboratorio TSD', appReport: { name, type: 'text/html', data: '' }, appReportParsed: parsed }, DEFAULT_APP_CONFIGS);
ok(bad.discrepancies.some((d: any) => d.rule === 'R2') && bad.discrepancies.some((d: any) => d.rule === 'R11'), 'en otra clase el auditor detecta R2 y R11 (el reporte sí declara su clase)');

console.log('\n[3] Narrador IMMZ del Diario');
const n = narrateImmz([{ id: 'x', date: '2026-09-26', title: 't', reflection: 'r', skills: '', deontology: '', dimensions: '', tags: [], competencies: [], linkedGoals: [], classNumber: 9, appReportParsed: parsed } as any]);
ok(!!n && n.n === 1, `narrateImmz usa el reporte: «${n?.headline.slice(0, 90)}…»`);
console.log(fail ? `\n✗ ${fail} verificación(es) fallaron` : '\n✓ El reporte calza al 100 % con el Diario de Campo');
process.exit(fail ? 1 : 0);
