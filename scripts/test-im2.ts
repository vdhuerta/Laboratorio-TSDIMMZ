/**
 * Pruebas del traductor Laboratorio → immz-core (IMMZ 4.1). Reemplaza a las del IM2 v2 (ESTANDAR-IM2.md, obsoleto):
 * las fórmulas ya no viven en esta app; aquí se comprueba que la TRADUCCIÓN emite los eventos canónicos correctos
 * y que el núcleo los calcula con la fórmula canónica.   Uso: npx tsx scripts/test-im2.ts
 */
import fs from 'fs';
import crypto from 'crypto';
import { register } from 'node:module';
import type { ActivityKey, LabEvent, Snapshot } from '../src/labTypes';

// la app importa imágenes (lab.ts): se sustituyen por un texto para poder correr esto con tsx sin empaquetar
register('./assets-loader.mjs', import.meta.url);
const { computeIndicators, toImmzEvents } = await import('../src/lib/metrics');
const { evaluateAnswer } = await import('../src/data/expected');
const L = await import('../src/data/lab');
const { laneCount, opportunityTarget, sessionOpportunity, piezasCerca, totalLanes, FORMAS, PERFIL_REGISTROS, TARGET_MIN, TARGET_MAX, escalonesDe, ladosDe, puenteMetas, realTarget, isLaneCorrect, isLaneWrong, isLaneFlagged, visualCapacity, formOf } = L;

let n = 0, fails = 0;
const ev = (t: number, type: LabEvent['type'], lane?: number, payload?: Record<string, unknown>, activity: ActivityKey = 'TSD1', extra: Partial<LabEvent> = {}): LabEvent => ({ id: 'e' + String(n++).padStart(5, '0'), timestamp: t * 1000, activity, type, laneIndex: lane, payload, ...extra });
const place = (t: number, lane: number, len: number, sumBefore: number, target: number, activity: ActivityKey = 'TSD1') => {
  const over = sumBefore + len > target;
  return ev(t, 'place', lane, { fits: !over, isOverflow: over, isWrong: false, rejected: false, closes: sumBefore < target && sumBefore + len >= target, sumBefore, target }, activity, { rodLength: len });
};
const remove = (t: number, lane: number, len: number, wasIncorrect: boolean, activity: ActivityKey = 'TSD1') => ev(t, 'remove', lane, { wasIncorrect, sumBefore: 0 }, activity, { rodLength: len });
const snap = (history: LabEvent[], answers: Partial<Snapshot['answers']> = {}, formId: 'A' | 'B' | 'C' = 'A'): Snapshot => ({ history, lanes: { TSD1: [], TSD2: [], TSD3: [] }, answers: { q1: '', q2: '', q3: '', q4: '', tsd2Bridge: '', tsd3Bridge: '', ...answers }, formulationStates: {}, anchorStates: { TSD2: { devolutionLevel: 0, revisionsCount: 0 }, TSD3: { devolutionLevel: 0, revisionsCount: 0 } }, config: { formId, targetUnits: 6, judgmentEnabled: true } });
const val = (s: Snapshot, code: string, scope?: ActivityKey) => computeIndicators(s, scope).find((r) => r.code === code)?.value ?? null;
const chk = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(ok ? 'OK  ' : 'FAIL', name, '→', JSON.stringify(got), ok ? '' : `(esperado ${JSON.stringify(want)})`); if (!ok) { fails++; process.exitCode = 1; } };

// Carril 9 (meta 10): 6 + 6 se pasa (error); luego se retira el 6 y se completa con 4.
const errThenFix = (withDev: boolean): LabEvent[] => [
  place(100, 9, 6, 0, 10), place(110, 9, 6, 6, 10),               // error: 12 > 10
  ...(withDev ? [ev(120, 'devolution_open', 9, { scope: 'construction', lane: 9, case: 'error', key: 'k' })] : []),
  remove(130, 9, 6, true), place(140, 9, 4, 6, 10),               // repara: 6 + 4 = 10
];

/* ── Tarea 1 · traducción ── */
const E = toImmzEvents(snap(errThenFix(true)));
chk('T1 unidad = carril', [...new Set(E.filter((e) => e.type === 'intento').map((e) => (e as { unidad: string }).unidad))], ['TSD1:9']);
chk('T1 colocar y retirar son intentos (4)', E.filter((e) => e.type === 'intento').length, 4);
chk('T1 no se emite revision (la deriva el núcleo)', E.filter((e) => e.type === 'revision').length, 0);
chk('T1 cambio de actividad = fase', toImmzEvents(snap([ev(5, 'activity_switch', undefined, { from: 'TSD1', to: 'TSD2' }, 'TSD2')])).filter((e) => e.type === 'fase').length, 1);
chk('T1 IM1 usa 5–60 s del núcleo (pausas de 10 s → 100)', val(snap([place(0, 9, 3, 0, 10), place(10, 9, 3, 3, 10), place(20, 9, 3, 6, 10)]), 'IM1'), 100);
chk('T1 IM1 pausas de 3 s → 0 (ya no rige 1,2 s)', val(snap([place(0, 9, 3, 0, 10), place(3, 9, 3, 3, 10), place(6, 9, 3, 6, 10)]), 'IM1'), 0);
chk('T1 IM1 pausa de 90 s → 0 (ya no rige 90 s)', val(snap([place(0, 9, 3, 0, 10), place(90, 9, 3, 3, 10)]), 'IM1'), 0);
chk('T1 IM9 cuenta el primer cierre del carril (acierta al primer cierre → 100)', val(snap([place(0, 9, 4, 0, 10), place(5, 9, 6, 4, 10)]), 'IM9'), 100);
chk('T1 IM9 primer cierre con exceso → 0', val(snap([place(0, 9, 6, 0, 10), place(5, 9, 6, 6, 10), remove(9, 9, 6, true), place(12, 9, 4, 6, 10)]), 'IM9'), 0);

/* ── Tarea 2 · IM3 ── */
chk('T2 retirar NO es consultar: error + retiro + acierto → IM3 = 50', val(snap(errThenFix(false)), 'IM3'), 50);
chk('T2 abrir el panel tras el error + acierto → IM3 = 100', val(snap(errThenFix(true)), 'IM3'), 100);
chk('T2 devolución abierta ANTES del error no cuenta → 50', val(snap([ev(50, 'devolution_open', 9, { scope: 'construction', lane: 9 }), ...errThenFix(false)]), 'IM3'), 50);
chk('T2 devolución sin carril no genera evento', toImmzEvents(snap([ev(1, 'devolution_open', undefined, { scope: 'construction', lane: null, case: 'inicio' })])).filter((e) => e.type === 'devolucion').length, 0);
chk('T2 IM4: devolución + intento en el mismo carril ≤ 5 min → 100', val(snap([place(0, 9, 3, 0, 10), ev(10, 'devolution_open', 9, { lane: 9 }), place(60, 9, 3, 3, 10)]), 'IM4'), 100);
chk('T2 IM4: el intento fue en otro carril → 0', val(snap([place(0, 9, 3, 0, 10), ev(10, 'devolution_open', 9, { lane: 9 }), place(60, 8, 3, 0, 9)]), 'IM4'), 0);
chk('T2 IM4: pasados 5 min → 0', val(snap([place(0, 9, 3, 0, 10), ev(10, 'devolution_open', 9, { lane: 9 }), place(10 + 301, 9, 3, 3, 10)]), 'IM4'), 0);

/* ── Tarea 3 · IM10 mide corrección, no extensión ── */
const ans = (key: string, text: string, t: number, activity: ActivityKey = 'TSD1') => { const e = evaluateAnswer(key as 'q1', text); return ev(t, 'question_answer', undefined, { bridge: key.endsWith('Bridge'), key, empty: !text.trim(), chars: e.caracteres, words: e.palabras, correcta: e.correcta }, activity, { questionId: key.startsWith('q') ? Number(key.slice(1)) : undefined }); };
const longWrong = 'Me gustó mucho armar la escalera porque los colores eran bonitos y divertidos y pasé un buen rato probando piezas distintas todo el rato.';
chk('T3 respuesta larga pero sin los términos → incorrecta', evaluateAnswer('q2', longWrong).correcta, false);
chk('T3 respuesta corta con UN solo grupo (la blanca) → incorrecta (se piden ≥3 grupos)', evaluateAnswer('q2', 'La blanca').correcta, false);
chk('T3 q2 con 3 grupos → correcta', evaluateAnswer('q2', 'La blanca cubre cualquiera de las otras').correcta, true);
chk('T3 q4 correcta ("le sumas una unidad")', evaluateAnswer('q4', 'Al escalón anterior le sumas una unidad, siempre').correcta, true);
chk('T3 vacía → incorrecta', evaluateAnswer('q1', '').correcta, false);
chk('T3 IM10 larga e incorrecta = 0 (el largo no cuenta)', val(snap([ans('q2', longWrong, 10)], { q2: longWrong }), 'IM10'), 0);
chk('T3 IM10 correcta (3 grupos) = 25 de 4 ofrecidas', val(snap([ans('q2', 'La blanca cubre cualquiera de las otras', 10)], { q2: 'La blanca cubre cualquiera de las otras' }), 'IM10', 'TSD1'), 25);
const f = toImmzEvents(snap([ans('q2', 'La blanca cubre cualquiera de las otras', 10)])).find((e) => e.type === 'formulacion') as { correcta: boolean; caracteres: number; palabras: number; modo: string };
chk('T3 evento formulacion lleva correcta y caracteres/palabras descriptivos', [f.correcta, f.caracteres, f.palabras, f.modo], [true, 'La blanca cubre cualquiera de las otras'.length, 7, 'texto']);
chk('T3 una respuesta revisada cuenta una sola vez (la última)', toImmzEvents(snap([ans('q2', 'no sé', 10), ans('q2', 'La blanca', 20)])).filter((e) => e.type === 'formulacion').length, 1);

/* ── Tarea 5 · IM11 ── */
const jui = (t: number, lane: number, declared: boolean, real: boolean) => ev(t, 'judgment', lane, { declared, real });
chk('T5 IM11 sin juicios → null', val(snap([place(0, 9, 3, 0, 10)]), 'IM11'), null);
chk('T5 IM11 2 de 3 calibrados → 67', val(snap([jui(1, 9, true, true), jui(2, 8, false, false), jui(3, 7, true, false)]), 'IM11'), 67);

/* ── Estructura de la sesión: 18 carriles (10 / 4 / 4), metas DECLARADAS ── */
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const CFG = { formId: 'A' as const, targetUnits: 6 };
chk('E1 carriles por actividad 10 / 4 / 4 y 18 en la sesión', [(['TSD1', 'TSD2', 'TSD3'] as const).map((a) => laneCount(a)), totalLanes()], [[10, 4, 4], 18]);
chk('E1 opportunity_target de la sesión: 18 carriles, 18 devoluciones, 6 formulaciones', sessionOpportunity(), { lanes: 18, devoluciones: 18, formulaciones: 6 });
chk('E1 opportunity_target por actividad', (['TSD1', 'TSD2', 'TSD3'] as const).map((a) => opportunityTarget(a)), [{ lanes: 10, devoluciones: 10, formulaciones: 4 }, { lanes: 4, devoluciones: 4, formulaciones: 1 }, { lanes: 4, devoluciones: 4, formulaciones: 1 }]);
chk('E1 piezas esperadas de la cerca = 11 en cada forma', FORMAS.map((f) => piezasCerca({ formId: f.id, targetUnits: 6 })), FORMAS.map(() => 11));
chk('E1 declaración de sesión (forma A, un solo content_id)', formOf(CFG), { formId: 'A', contentLevel: 1, contentId: 'lab-tsd-A' });

/* Todo lo siguiente se verifica en CADA forma declarada en FORMAS (hoy A; B y C al validarse su contenido). */
for (const f of FORMAS) {
  const cfg = { formId: f.id, targetUnits: 6 };
  const esc = escalonesDe(cfg);
  chk(`F-${f.id} TSD1: 10 escalones con el conjunto de metas 1..10 sin repetir ni omitir`, esc.map((e) => e.meta).sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  chk(`F-${f.id} TSD1: rótulos 10..1 sin repetir (el rótulo es independiente de la meta)`, esc.map((e) => e.rotulo).sort((x, y) => y - x), [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  chk(`F-${f.id} TSD1: realTarget lee la meta del Escalon`, esc.map((_, i) => realTarget('TSD1', i, cfg)), esc.map((e) => e.meta));
  chk(`F-${f.id} TSD1: UNA regleta de largo = meta valida; combinar (suma = meta) NO valida`, esc.map((e, i) => [isLaneCorrect('TSD1', i, [e.meta], cfg), e.meta > 1 ? isLaneCorrect('TSD1', i, [1, e.meta - 1], cfg) : false]), esc.map(() => [true, false]));
  chk(`F-${f.id} TSD1: una regleta distinta de la meta es error marcado (ojo rojo)`, esc.map((e, i) => isLaneFlagged('TSD1', i, [e.meta === 10 ? 9 : e.meta + 1], cfg)), esc.map(() => true));
  chk(`F-${f.id} TSD1: ni la posición (i+1) ni el rótulo validan salvo coincidencia con la meta declarada`, esc.map((e, i) => [isLaneCorrect('TSD1', i, [i + 1], cfg), isLaneCorrect('TSD1', i, [e.rotulo], cfg)]), esc.map((e, i) => [e.meta === i + 1, e.meta === e.rotulo]));
  chk(`F-${f.id} TSD1: visualCapacity no depende del índice`, new Set(esc.map((_, i) => visualCapacity('TSD1', i, cfg))).size, 1);
  const pm = puenteMetas(cfg);
  chk(`F-${f.id} TSD2: 4 vías con metas dentro de {5,6,7}`, [pm.length, pm.every((m) => m >= 5 && m <= 7)], [4, true]);
  chk(`F-${f.id} TSD2: cualquier descomposición que sume la meta valida (y solo esas)`, pm.map((m, i) => [isLaneCorrect('TSD2', i, [m], cfg), isLaneCorrect('TSD2', i, [1, m - 1], cfg), isLaneCorrect('TSD2', i, [m + 1], cfg)]), pm.map(() => [true, true, false]));
  const lados = ladosDe(cfg);
  chk(`F-${f.id} TSD3: 4 lados, perímetro 12 en cada patrón`, [lados.length, lados.every((l) => sum(l.pattern) === 12)], [4, true]);
  chk(`F-${f.id} TSD3: sin patrones repetidos entre lados`, new Set(lados.map((l) => l.pattern.slice().sort((a, b) => a - b).join('+'))).size, 4);
  chk(`F-${f.id} TSD3: perfil de registros L1 mult. / L2 algebraico / L3 duplicación / L4 agrupamiento`, lados.slice().sort((a, b) => a.label.localeCompare(b.label)).map((l) => l.registro), PERFIL_REGISTROS);
  const same = (a: number[], b: number[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  const otra = (l: { pattern: number[]; equivalentes?: number[][] }) => [[12], [1, 11], [2, 10], [3, 9], [4, 8], [5, 7], [6, 6], [2, 2, 8], [4, 4, 4], [1, 1, 10], [2, 5, 5]].find((c) => ![l.pattern, ...(l.equivalentes ?? [])].some((p) => same(c, p)))!;
  chk(`F-${f.id} TSD3: cada lado valida SOLO con su patrón (otra composición de suma 12 es error de conversión)`, lados.map((l) => [isLaneCorrect('TSD3', l.idx, l.pattern.slice().reverse(), cfg), isLaneCorrect('TSD3', l.idx, otra(l), cfg), isLaneWrong('TSD3', l.idx, otra(l), cfg)]), lados.map(() => [true, false, true]));
  const L3e = lados.find((l) => l.registro === 'natural_duplicacion')!;
  const X = Number(L3e.clue.match(/doble de (\d+)/)![1]), Y = Number(L3e.clue.match(/más (\d+)/)![1]);
  chk(`F-${f.id} TSD3: «${L3e.clue}» valida con {X,X,Y} y con {2X,Y} (2 + ${Y}), no con otra cosa`, [[X, X, Y], [2 * X, Y], [Y, 2 * X], [2 * X + Y]].map((c) => isLaneCorrect('TSD3', L3e.idx, c, cfg)), [true, true, true, false]);
  chk(`F-${f.id} TSD3: las equivalentes suman 12 y usan regletas existentes`, lados.every((l) => (l.equivalentes ?? []).every((e) => sum(e) === 12 && e.every((r) => r >= 1 && r <= 10))), true);
  chk(`F-${f.id} TSD3: 11 piezas en la cerca`, lados.reduce((n, l) => n + l.pattern.length, 0), 11);
  const uso: Record<number, number> = {}; lados.forEach((l) => l.pattern.forEach((r) => { uso[r] = (uso[r] ?? 0) + 1; }));
  chk(`F-${f.id} TSD3: ninguna longitud se usa más de 4 veces en TODA la cerca (inventario compartido de 4) y existen las regletas`, [Math.max(...Object.values(uso)) <= 4, Object.keys(uso).every((r) => Number(r) >= 1 && Number(r) <= 10)], [true, true]);
  const L4 = lados.find((l) => l.registro === 'comparacion_aditiva')!; const dif = Math.max(...L4.pattern) - Math.min(...L4.pattern);
  chk(`F-${f.id} TSD3: L4 es {a, a+d} con 2a+d=12 y la pista nombra d`, [L4.pattern.length, dif, L4.clue.endsWith(String(dif))], [2, dif, true]);
  const L3 = lados.find((l) => l.registro === 'natural_duplicacion')!; const cnt: Record<number, number> = {}; L3.pattern.forEach((r) => { cnt[r] = (cnt[r] ?? 0) + 1; });
  chk(`F-${f.id} TSD3: L3 «doble de X más Y» se rinde como {X, X, Y}`, L3.clue.match(/doble de (\d+) más (\d+)/)!.slice(1).map(Number).map((n, i) => (i === 0 ? L3.pattern.filter((r) => r === n).length >= 2 : L3.pattern.includes(n))), [true, true]);
}
chk('F misma estructura entre formas: mismo conjunto de metas TSD1, misma suma TSD2/TSD3', FORMAS.every((f) => sum(escalonesDe({ formId: f.id, targetUnits: 6 }).map((e) => e.meta)) === 55), true);

/* ── Robustez: una forma con el ORDEN permutado (solo para la prueba; no se agrega a la app) lee las metas declaradas ── */
{
  const orden = [7, 2, 9, 5, 10, 1, 8, 4, 6, 3];
  const tmp = { ...FORMAS[0], id: 'Z' as unknown as 'C', escalera: orden.map((meta, i) => ({ id: `E${10 - i}`, rotulo: 10 - i, meta })) };
  FORMAS.push(tmp);
  const cfg = { formId: 'Z' as unknown as 'C', targetUnits: 6 };
  chk('PERM carril 0 rotulado 10 con meta 7: valida con la regleta 7', [isLaneCorrect('TSD1', 0, [7], cfg), isLaneCorrect('TSD1', 0, [1], cfg), isLaneCorrect('TSD1', 0, [10], cfg)], [true, false, false]);
  chk('PERM cada carril valida contra su meta declarada (10/10) y no contra la posición', [orden.every((m, i) => isLaneCorrect('TSD1', i, [m], cfg)), orden.filter((m, i) => isLaneCorrect('TSD1', i, [i + 1], cfg)).length], [true, orden.filter((m, i) => m === i + 1).length]);
  FORMAS.pop();
}

/* ── Ningún indicador devuelve 0 ni 100 por AUSENCIA de evidencia ── */
chk('V6 sesión vacía: todos los indicadores son null (sin evidencia)', computeIndicators(snap([])).map((r) => r.value), computeIndicators(snap([])).map(() => null));
chk('V6 solo colocar una regleta correcta: IM3, IM4, IM5, IM10 y IM11 siguen sin evidencia', ['IM3', 'IM4', 'IM5', 'IM10', 'IM11'].map((c) => val(snap([place(0, 9, 10, 0, 10)]), c)), [null, null, null, null, null]);

/* ── el núcleo es idéntico al del Simulador (si está a mano) ── */
const SIM = process.env.SIM_CORE ?? '/home/claude/simulador-tsd-immz/src/immz-core';
if (fs.existsSync(SIM)) {
  const h = (d: string) => fs.readdirSync(d).sort().map((f) => f + ':' + crypto.createHash('sha1').update(fs.readFileSync(`${d}/${f}`)).digest('hex')).join('|');
  chk('immz-core idéntico al del Simulador (sha1 por archivo)', h('src/immz-core') === h(SIM), true);
} else console.log('SKIP immz-core idéntico (no hay copia del Simulador en', SIM, ')');

/* ── Ficha de IM11 en el reporte (metadatos y presentación; no toca fórmulas) ── */
{
  const { buildReport } = await import('../src/lib/immzReport');
  const { INDICATORS, COMPAT_4_0_IDS } = await import('../src/config');
  const { default: cfgMod } = await import('../src/analysis/labConfig').then((m) => ({ default: (m as Record<string, any>) }));
  const labCfg = Object.values(cfgMod).find((v: any) => v && v.indicators && v.indicators.IM11) as any;
  const im11 = INDICATORS.find((d) => d.id === 'IM11');
  chk('IM11 en INDICATORS: dimensión A, sub AO, etiqueta y alias', [im11?.dimension, im11?.sub, im11?.label, im11?.aliases], ['A', 'AO', 'Calibración del juicio metacognitivo', ['calibracion', 'juicio', 'calibration', 'metacognitive_judgment']]);
  chk('IM11 ficha: name y authors exactos', [labCfg?.indicators.IM11.name, labCfg?.indicators.IM11.authors], ['IM11. Calibración del Juicio Metacognitivo', 'Nelson y Narens (1990), actualizado por Lee y Bosch (2025) — Monitoreo en el meta-nivel']);
  chk('compat 4.0 sin IM11', COMPAT_4_0_IDS.includes('IM11'), false);
  const hist = [place(0, 9, 3, 0, 10), jui(5, 0, true, true), jui(9, 1, true, false), jui(14, 2, false, false)];
  const r = buildReport({ participantName: 'Ana Prueba', classNumber: 9, snap: snap(hist), now: new Date('2026-10-05T12:00:00Z') });
  const i0 = r.html.indexOf('data-variable="IM11"');
  chk('reporte: hay una tarjeta IM11', i0 > 0, true);
  const card = r.html.slice(i0, i0 + 2500);
  chk('tarjeta IM11: nombre, autores y descripción visibles', ['IM11. Calibración del Juicio Metacognitivo', 'Nelson y Narens (1990), actualizado por Lee y Bosch (2025)', 'juicios acertados ÷ juicios emitidos'].every((t) => card.includes(t)), true);
  const aoStart = r.html.indexOf('Autoobservación'); const acStart = r.html.indexOf('Autocontrol', aoStart);
  chk('IM11 está dentro de Autoobservación (antes de Autocontrol), junto a IM1 e IM2', i0 > aoStart && i0 < acStart && r.html.indexOf('data-variable="IM1"') > aoStart && r.html.indexOf('data-variable="IM2"') > aoStart, true);
  const val11 = r.indicators.find((x) => x.code === 'IM11')?.value;
  chk('IM11 tiene valor (2 de 3 juicios acertados → 67)', val11, 67);
  chk('reporte: valor mostrado en la tarjeta', card.includes('data-value="67"'), true);
  chk('nota al pie del bloque de la Dimensión 1', r.html.includes('data-testid="nota-im11"') && r.html.includes('IM11 pertenece al bloque 4.1 del esquema'), true);
  const pj = JSON.stringify(r.payload);
  const compat = (r.payload as any).indicators as { id: string }[];
  chk('payload 4.0: sin IM11 y con IM1–IM10', [compat.some((x) => x.id === 'IM11'), compat.length], [false, 10]);
  chk('payload 4.1 (immz41.im11) sí lleva IM11 con su valor', (r.payload as any).immz41?.im11?.value, 67);
}
console.log(fails ? `\n${fails} FALLA(S)` : '\nTodo OK');
