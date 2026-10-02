import { INDICATORS } from '../config';
import type { AppReportIndicator } from '../types';
import { ACTIVITIES, LANE_COUNT, TOTAL_LANES, isLaneCorrect } from '../data/lab';
import type { ActivityKey, LabEvent, Snapshot } from '../labTypes';
import { categorize, computeIndices, diagnose } from './immz/scoring';

/**
 * MOTOR DE INDICADORES IM1–IM10 (esquema canónico 4.0 del Diario)
 * ────────────────────────────────────────────────────────────────
 * Principios (los mismos del Simulador TSD):
 *  · Cada indicador sale SOLO de la traza (eventos) y del estado de la sesión; no hay valores por defecto.
 *  · Sin evidencia → null. El Diario no cuenta null como 0 y el reporte lo muestra como «Sin evidencia».
 *  · Subdimensiones: AO = IM1–IM2 · AC = IM3–IM5 · IDCD = IM6–IM10 (ver config.ts).
 *  · Los índices se calculan con el scoring del Diario (media simple, 1 decimal), no aquí.
 * Los umbrales están al principio para ajustarlos sin tocar la lógica.
 */
export const IM1_MIN_MS = 1200;          // pausa mínima entre dos colocaciones consecutivas para contar como deliberada
export const IM1_MAX_MS = 90000;         // pausa máxima (más allá se interpreta como desconexión)
export const TEST_EPISODE_GAP_MS = 60000; // piezas colocadas en Experimenta con menos de 60 s entre sí = un mismo episodio
export const FEEDBACK_WINDOW_MS = 300000; // IM4: ventana de 5 min para que una devolución se traduzca en un reajuste
export const IM2_W_AFTER_MS = 180000;     // IM2 v2: un acto sin carril se atribuye a la primera manipulación de los 180 s siguientes…
export const IM2_W_BEFORE_MS = 120000;    // …o, si no hay, a la última manipulación de los 120 s anteriores
export const SCORING_VERSION = 2;         // versión del cálculo de IM2 (ESTANDAR-IM2.md); los reportes sin este campo son versión 1
export const MIN_ANSWER_CHARS = 25;       // IM10: una respuesta formal debe tener al menos 25 caracteres…
export const MIN_ANSWER_WORDS = 4;        // …y 4 palabras

export interface IndicatorResult {
  code: string;            // IM1…IM10
  value: number | null;    // 0–100 entero; null = sin evidencia
  numerator: number | null;
  denominator: number;     // tamaño de la evidencia (0 → null)
  formula: string;
  feedback: string;
}

const pct = (n: number, d: number) => Math.round((n / d) * 100);
const band = (v: number | null, t: { hi: string; mid: string; low: string; none: string }) => (v === null ? t.none : v >= 80 ? t.hi : v >= 50 ? t.mid : t.low);

/** Retroalimentación cualitativa por indicador (tres bandas: ≥80, 50–79, <50). */
export const IM_TEXT: Record<string, { hi: string; mid: string; low: string; none: string }> = {
  IM1: { none: 'Sin evidencia suficiente para medir el ritmo de colocación.', hi: 'Ritmo de planificación reflexivo y autorregulado: cada regleta se coloca tras una pausa deliberada.', mid: 'Ritmo en desarrollo: alterna pausas deliberadas con colocaciones aceleradas.', low: 'Tiende a colocar regletas de forma impulsiva, sin pausar para analizar el espacio disponible.' },
  IM2: { none: 'Sin evidencia de manipulaciones sobre las que medir la reflexión.', hi: 'Utiliza activamente Experimenta, las preguntas y las devoluciones como instancias de detención reflexiva.', mid: 'Reflexión en progreso: consulta los apoyos, aunque predomina la manipulación directa.', low: 'Prioriza el ensayo mecánico directo sobre la exploración previa y los instrumentos de reflexión.' },
  IM3: { none: 'Sin evidencia de errores a corregir en esta sesión.', hi: 'Detecta el desajuste, retira piezas por iniciativa propia y llega a la configuración correcta.', mid: 'Corrige parte de sus errores: reconoce el desajuste, pero no siempre logra repararlo.', low: 'Tras un error, no retira ni repara la construcción: el desajuste queda sin resolver.' },
  IM4: { none: 'Sin evidencia: no se solicitaron devoluciones didácticas.', hi: 'Aplica activamente las pistas didácticas: tras cada devolución reajusta su acción o su escrito.', mid: 'Aprovecha parcialmente las devoluciones: algunas se traducen en un reajuste y otras no.', low: 'Consulta devoluciones pero no modifica su estrategia a continuación.' },
  IM5: { none: 'Sin evidencia de colocaciones erróneas de las que recuperarse.', hi: 'Persiste y reajusta de inmediato tras exceder la meta o componer mal un lado.', mid: 'Capacidad adaptativa aceptable: se recupera de algunos errores, no de todos.', low: 'Abandona o repite el mismo error tras exceder la capacidad del carril.' },
  IM6: { none: 'Sin evidencia de acciones sobre las que evaluar la secuencia didáctica.', hi: 'Respeta la secuencia adidáctica: actúa sobre el medio antes de pedir ayuda y formula después de construir.', mid: 'Alineación aceptable, con algún salto de fase (ayuda antes de actuar o formulación antes de construir).', low: 'Saltos de fase frecuentes: solicita devoluciones antes de actuar o formula sin haber construido.' },
  IM7: { none: 'Sin evidencia de colocaciones de regletas.', hi: 'Fluidez motora y baja carga cognitiva superflua: casi no coloca y retira de inmediato la misma pieza.', mid: 'Vacilación moderada: algunas piezas se colocan y se retiran enseguida.', low: 'Movimientos titubeantes repetidos en el mismo carril (coloca y retira la misma regleta).' },
  IM8: { none: 'Sin evidencia de colocaciones de regletas.', hi: 'Estima anticipadamente la longitud disponible antes de posicionar cada pieza.', mid: 'Ensayo y error moderado: conviven hipótesis válidas con piezas que exceden la meta.', low: 'Inserta piezas de dimensiones superiores al espacio remanente: ensayo sin anticipación.' },
  IM9: { none: 'Sin evidencia: aún no hay carriles completados correctamente.', hi: 'Planifica antes de ejecutar: resuelve los carriles con precisión en su primera configuración.', mid: 'Planificación inicial aceptable: parte de los carriles requirió ajustes sucesivos.', low: 'Requiere ajustes sucesivos (retiros o excesos) para lograr la suma deseada en cada carril.' },
  IM10: { none: 'Sin evidencia: aún no se abren ni se responden preguntas de formulación o anclajes.', hi: 'Articula sus descubrimientos en el registro de formulación escrita y en los anclajes conceptuales.', mid: 'Apropiación intermedia: responde parte de las formulaciones o lo hace de forma breve.', low: 'Registra explicaciones breves o incompletas, o no llega a formular por escrito sus hallazgos.' },
};

/* ───────────── utilidades de lectura de la traza ───────────── */
export const substantive = (s: string | undefined) => { const t = (s ?? '').trim(); return t.length >= MIN_ANSWER_CHARS && t.split(/\s+/).filter(Boolean).length >= MIN_ANSWER_WORDS; };
const laneKey = (e: LabEvent) => `${e.activity}:${e.laneIndex}`;
const isErr = (e: LabEvent) => e.type === 'place' && (e.payload?.isOverflow === true || e.payload?.isWrong === true);

/** Claves de respuesta formal (formulación y anclajes) que pertenecen al alcance pedido. */
export const promptKeys = (scope?: ActivityKey): (keyof Snapshot['answers'])[] => (scope === 'TSD1' ? ['q1', 'q2', 'q3', 'q4'] : scope === 'TSD2' ? ['tsd2Bridge'] : scope === 'TSD3' ? ['tsd3Bridge'] : ['q1', 'q2', 'q3', 'q4', 'tsd2Bridge', 'tsd3Bridge']);

/** Episodios de uso de Experimenta: piezas consecutivas con < 60 s entre sí cuentan como UN episodio. */
export function testEpisodes(events: LabEvent[]): number {
  const t = events.filter((e) => e.type === 'test_area_use').map((e) => e.timestamp).sort((a, b) => a - b);
  let n = 0; t.forEach((ts, i) => { if (i === 0 || ts - t[i - 1] > TEST_EPISODE_GAP_MS) n++; });
  return n;
}

/** Cuántos actos de reflexión registró el participante (Experimenta + preguntas abiertas + devoluciones + respuestas escritas). */
export function reflectiveActs(snap: Snapshot, scope?: ActivityKey) {
  const E = scope ? snap.history.filter((e) => e.activity === scope) : snap.history;
  const opened = new Set<string>();
  E.forEach((e) => { if (e.type === 'question_open' && e.questionId) opened.add(`q${e.questionId}`); if (e.type === 'anchor_open') opened.add(`anchor:${e.activity}`); });
  const devs = E.filter((e) => e.type === 'devolution_request').length;
  const answered = promptKeys(scope).filter((k) => (snap.answers[k] ?? '').trim().length > 0).length;
  const episodes = testEpisodes(E);
  return { episodes, opened: opened.size, devs, answered, total: episodes + opened.size + devs + answered };
}


/** IM2 v2 · cobertura reflexiva por unidad de trabajo (carril). Ver ESTANDAR-IM2.md. */
export interface Im2Unit { activity: ActivityKey; unit: number; credit: number; acts: string[] }
export function im2Detail(events: LabEvent[]): { units: Im2Unit[]; credit: number; worked: number } {
  const E = events.slice().sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  const manips = E.filter((e) => (e.type === 'place' || e.type === 'remove') && e.laneIndex !== undefined);
  const units = new Map<string, Im2Unit>();
  manips.forEach((m) => { const k = `${m.activity}:${m.laneIndex}`; if (!units.has(k)) units.set(k, { activity: m.activity, unit: m.laneIndex!, credit: 0, acts: [] }); });
  const mark = (u: Im2Unit | undefined, code: string) => { if (u && !u.acts.includes(code)) u.acts.push(code); };
  // atribución temporal de un acto sin carril: primera manipulación ≤ 180 s después; si no hay, la última ≤ 120 s antes
  const attribute = (activity: ActivityKey, t: number): Im2Unit | undefined => {
    const ms = manips.filter((m) => m.activity === activity);
    const next = ms.find((m) => m.timestamp >= t && m.timestamp - t <= IM2_W_AFTER_MS);
    const prev = next ? undefined : [...ms].reverse().find((m) => m.timestamp <= t && t - m.timestamp <= IM2_W_BEFORE_MS);
    const m = next ?? prev; return m ? units.get(`${m.activity}:${m.laneIndex}`) : undefined;
  };
  // AR-EXP: episodios en Experimenta (piezas con < 60 s entre sí = un episodio)
  (['TSD1', 'TSD2', 'TSD3'] as ActivityKey[]).forEach((a) => {
    const ts = E.filter((e) => e.activity === a && e.type === 'test_area_use').map((e) => e.timestamp);
    ts.forEach((t, i) => { if (i === 0 || t - ts[i - 1] > TEST_EPISODE_GAP_MS) mark(attribute(a, t), 'AR-EXP'); });
  });
  // AR-DEV: devolución de la construcción (con carril → directo; sin carril → atribución temporal)
  E.filter((e) => e.type === 'devolution_request' && e.payload?.scope === 'construction').forEach((e) => {
    mark(e.laneIndex !== undefined ? units.get(`${e.activity}:${e.laneIndex}`) : attribute(e.activity, e.timestamp), 'AR-DEV');
  });
  // AR-ACT: apoyos de actividad (preguntas, anclaje, Mirada didáctica, devoluciones de formulación/anclaje)
  const actAct = new Set<ActivityKey>();
  E.forEach((e) => { if (e.type === 'question_open' || e.type === 'anchor_open' || e.type === 'didactic_view' || (e.type === 'devolution_request' && e.payload?.scope !== 'construction')) actAct.add(e.activity); });
  let credit = 0;
  units.forEach((u) => { u.credit = u.acts.length ? 1 : actAct.has(u.activity) ? 0.5 : 0; if (u.credit === 0.5) u.acts.push('AR-ACT'); credit += u.credit; });
  return { units: [...units.values()].sort((a, b) => a.activity.localeCompare(b.activity) || a.unit - b.unit), credit, worked: units.size };
}

/* ───────────── los 10 indicadores ───────────── */
export function computeIndicators(snap: Snapshot, scope?: ActivityKey): IndicatorResult[] {
  const E = (scope ? snap.history.filter((e) => e.activity === scope) : snap.history).slice().sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  const places = E.filter((e) => e.type === 'place');
  const removes = E.filter((e) => e.type === 'remove');
  const manip = places.length + removes.length;
  const devs = E.filter((e) => e.type === 'devolution_request');
  const im2 = im2Detail(E);
  const refl = reflectiveActs(snap, scope);

  // IM1 · Vigilancia: pares de colocaciones/retiros CONSECUTIVOS (sin otro evento en medio) separados por 1,2–90 s
  let vig = 0, vigDen = 0;
  for (let i = 1; i < E.length; i++) {
    const a = E[i - 1], b = E[i];
    if ((a.type !== 'place' && a.type !== 'remove') || (b.type !== 'place' && b.type !== 'remove') || a.activity !== b.activity) continue;
    vigDen++; const d = b.timestamp - a.timestamp; if (d >= IM1_MIN_MS && d <= IM1_MAX_MS) vig++;
  }

  // IM3 · Autocorrección: por carril con error → 50 si retiró piezas tras el error (detección) + 50 si luego lo validó (reparación)
  const errIdx = E.map((e, i) => (isErr(e) ? i : -1)).filter((i) => i >= 0);
  const errLanes = [...new Set(errIdx.map((i) => laneKey(E[i])))];
  let errScore = 0;
  errLanes.forEach((k) => {
    const idxs = errIdx.filter((i) => laneKey(E[i]) === k);
    const first = idxs[0], last = idxs[idxs.length - 1];
    if (E.some((e, i) => i > first && e.type === 'remove' && laneKey(e) === k)) errScore += 50;
    if (E.some((e, i) => i > last && e.type === 'validation_success' && laneKey(e) === k)) errScore += 50;
  });

  // IM4 · Retroalimentación: devoluciones seguidas de una acción de reajuste en ≤ 5 min.
  //   · devolución de construcción con carril → reajuste = colocar/retirar en ESE carril
  //   · devolución de construcción sin carril → colocar/retirar/Experimenta en la actividad
  //   · devolución de formulación o anclaje → respuesta escrita/revisada o cualquier manipulación de la actividad
  const ACT = new Set(['place', 'remove', 'test_area_use', 'question_answer', 'answer_revision']);
  const effective = devs.filter((d) => {
    const di = E.indexOf(d); const construction = d.payload?.scope === 'construction';
    return E.some((e, i) => {
      if (i <= di || e.activity !== d.activity || !ACT.has(e.type) || e.timestamp - d.timestamp > FEEDBACK_WINDOW_MS) return false;
      if (!construction) return true;
      if (d.laneIndex !== undefined) return (e.type === 'place' || e.type === 'remove') && e.laneIndex === d.laneIndex;
      return e.type === 'place' || e.type === 'remove' || e.type === 'test_area_use';
    });
  }).length;

  // IM5 · Resiliencia: tras un error, la siguiente acción en ese carril es un retiro o una pieza de otro largo
  let adapt = 0;
  errIdx.forEach((i) => { const e = E[i]; const nx = E.find((x, j) => j > i && x.activity === e.activity && x.laneIndex === e.laneIndex && (x.type === 'remove' || x.type === 'place')); if (nx && (nx.type === 'remove' || nx.rodLength !== e.rodLength)) adapt++; });

  // IM6 · Secuencia: −20 por salto de fase (ayuda antes de actuar · formulación de anclaje antes de terminar de construir)
  let jumps = 0;
  (scope ? [scope] : ACTIVITIES).forEach((a) => {
    const firstPlace = E.findIndex((e) => e.activity === a && e.type === 'place');
    const askedEarly = E.some((e, i) => e.activity === a && e.type === 'devolution_request' && e.payload?.scope !== 'construction' && (firstPlace === -1 || i < firstPlace));
    if (askedEarly) jumps++;
    if (a !== 'TSD1') {
      const firstBridge = E.findIndex((e) => e.activity === a && e.type === 'question_answer' && e.payload?.bridge === true && e.payload?.empty !== true);
      const done = E.findIndex((e) => e.activity === a && e.type === 'activity_complete');
      if (firstBridge !== -1 && (done === -1 || firstBridge < done)) jumps++;
    }
  });

  // IM7 · Carga: colocación seguida de inmediato por el retiro de la misma pieza en el mismo carril
  let redundant = 0;
  for (let i = 0; i < E.length - 1; i++) { const a = E[i], b = E[i + 1]; if (a.type === 'place' && a.payload?.rejected !== true && b.type === 'remove' && a.activity === b.activity && a.laneIndex === b.laneIndex && a.rodLength === b.rodLength) redundant++; }

  // IM8 · Intencionalidad: colocaciones que caben en la meta real del carril
  const fitting = places.filter((p) => p.payload?.isOverflow !== true && p.payload?.fits !== false).length;

  // IM9 · Predicción: carriles validados en su primera configuración (sin retiros ni excesos previos)
  const validated = new Map<string, number>();
  E.forEach((e, i) => { if (e.type === 'validation_success' && !validated.has(laneKey(e))) validated.set(laneKey(e), i); });
  let clean = 0;
  validated.forEach((vi, k) => { if (!E.some((e, i) => i < vi && laneKey(e) === k && (e.type === 'remove' || isErr(e)))) clean++; });

  // IM10 · Formulación: respuestas formales sustantivas ÷ preguntas del alcance (4 + 2 anclajes)
  const keys = promptKeys(scope);
  const subst = keys.filter((k) => substantive(snap.answers[k])).length;
  const formEvidence = keys.some((k) => (snap.answers[k] ?? '').trim().length > 0) || refl.opened > 0;

  const rows: Omit<IndicatorResult, 'feedback'>[] = [
    { code: 'IM1', value: vigDen > 0 ? pct(vig, vigDen) : null, numerator: vig, denominator: vigDen, formula: 'pares de colocaciones/retiros consecutivos con pausa de 1,2–90 s ÷ pares consecutivos' },
    { code: 'IM2', value: im2.worked > 0 ? Math.round((im2.credit / im2.worked) * 100) : null, numerator: Math.round(im2.credit * 10) / 10, denominator: im2.worked, formula: 'carriles trabajados con un acto reflexivo atribuido (Experimenta o devolución = 1; solo apoyo de la actividad = 0,5) ÷ carriles trabajados' },
    { code: 'IM3', value: errLanes.length > 0 ? Math.round(errScore / errLanes.length) : null, numerator: errScore, denominator: errLanes.length, formula: 'por carril con error: 50 si retiró piezas tras el error + 50 si luego lo validó; promedio' },
    { code: 'IM4', value: devs.length > 0 ? pct(effective, devs.length) : null, numerator: effective, denominator: devs.length, formula: 'devoluciones seguidas de una acción de reajuste en ≤ 5 min ÷ devoluciones solicitadas' },
    { code: 'IM5', value: errIdx.length > 0 ? pct(adapt, errIdx.length) : null, numerator: adapt, denominator: errIdx.length, formula: 'errores (exceso de meta o lado mal compuesto) seguidos de retiro o pieza distinta en el mismo carril ÷ errores' },
    { code: 'IM6', value: places.length > 0 ? Math.max(0, 100 - jumps * 20) : null, numerator: jumps, denominator: places.length, formula: '100 − 20 × saltos de fase (devolución antes de actuar; anclaje escrito antes de completar la construcción)' },
    { code: 'IM7', value: places.length > 0 ? Math.max(0, pct(places.length - redundant, places.length)) : null, numerator: redundant, denominator: places.length, formula: '(colocaciones − colocaciones retiradas de inmediato) ÷ colocaciones' },
    { code: 'IM8', value: places.length > 0 ? pct(fitting, places.length) : null, numerator: fitting, denominator: places.length, formula: 'colocaciones que caben en la meta real del carril ÷ colocaciones totales' },
    { code: 'IM9', value: validated.size > 0 ? pct(clean, validated.size) : null, numerator: clean, denominator: validated.size, formula: 'carriles validados en su primera configuración (sin retiros ni excesos) ÷ carriles validados' },
    { code: 'IM10', value: formEvidence && keys.length > 0 ? pct(subst, keys.length) : null, numerator: subst, denominator: keys.length, formula: `respuestas de formulación/anclaje con ≥ ${MIN_ANSWER_CHARS} caracteres y ≥ ${MIN_ANSWER_WORDS} palabras ÷ ${keys.length} preguntas` },
  ];
  return rows.map((r) => ({ ...r, feedback: band(r.value, IM_TEXT[r.code]) }));
}

/** Saltos de fase detectados (para mostrarlos en el diagnóstico). */
export function phaseJumps(snap: Snapshot): string[] {
  const E = snap.history.slice().sort((a, b) => a.timestamp - b.timestamp);
  const out: string[] = [];
  ACTIVITIES.forEach((a) => {
    const firstPlace = E.findIndex((e) => e.activity === a && e.type === 'place');
    if (E.some((e, i) => e.activity === a && e.type === 'devolution_request' && e.payload?.scope !== 'construction' && (firstPlace === -1 || i < firstPlace))) out.push(`${a}: devolución solicitada antes de actuar`);
    if (a !== 'TSD1') {
      const fb = E.findIndex((e) => e.activity === a && e.type === 'question_answer' && e.payload?.bridge === true && e.payload?.empty !== true);
      const done = E.findIndex((e) => e.activity === a && e.type === 'activity_complete');
      if (fb !== -1 && (done === -1 || fb < done)) out.push(`${a}: anclaje escrito antes de completar la construcción`);
    }
  });
  return out;
}

/* ───────────── enlace con el scoring del Diario ───────────── */
export function toReportIndicators(res: IndicatorResult[]): AppReportIndicator[] {
  return INDICATORS.map((d) => { const v = res.find((r) => r.code === d.id)?.value ?? null; const level = categorize(v); return { id: d.id, value: v, level, diagnosis: diagnose(v, level) }; });
}
/** Índices con el MISMO scoring que usa el Diario (media simple con 1 decimal; null no cuenta). */
export const indicesOf = (res: IndicatorResult[]) => computeIndices(toReportIndicators(res));

/* ───────────── estado de la construcción y apropiación ───────────── */
export const laneLengths = (snap: Snapshot, a: ActivityKey, i: number) => (snap.lanes[a]?.[i] ?? []).map((r) => r.length);
export function correctLanes(snap: Snapshot, a?: ActivityKey): number {
  let n = 0;
  (a ? [a] : ACTIVITIES).forEach((act) => { for (let i = 0; i < LANE_COUNT[act]; i++) if (isLaneCorrect(act, i, laneLengths(snap, act, i), snap.config)) n++; });
  return n;
}
export const stageProgress = (snap: Snapshot, a: ActivityKey) => Math.round((correctLanes(snap, a) / LANE_COUNT[a]) * 100);
export const activityComplete = (snap: Snapshot, a: ActivityKey) => correctLanes(snap, a) === LANE_COUNT[a];

export interface SessionStats {
  totalMoves: number; placements: number; currentHits: number; currentErrors: number; reflections: number; devolutions: number; answered: number;
  appropriation: number | null; accuracy: number; efficiency: number; reflectionFactor: number;
  totalLanes: number; lanesTouched: number; hasEvidence: boolean;
}

export function computeStats(snap: Snapshot): SessionStats {
  const E = snap.history;
  const places = E.filter((e) => e.type === 'place');
  const removes = E.filter((e) => e.type === 'remove');
  const hits = correctLanes(snap);
  // Piezas que quedaron en carriles correctos ÷ colocaciones intentadas
  let kept = 0; ACTIVITIES.forEach((a) => { for (let i = 0; i < LANE_COUNT[a]; i++) if (isLaneCorrect(a, i, laneLengths(snap, a, i), snap.config)) kept += laneLengths(snap, a, i).length; });
  const accuracy = Math.min(100, (hits / TOTAL_LANES) * 100);
  const efficiency = places.length > 0 ? Math.min(100, (kept / places.length) * 100) : 0;
  const answered = promptKeys().filter((k) => (snap.answers[k] ?? '').trim().length > 0).length;
  const devolutions = E.filter((e) => e.type === 'devolution_request').length;
  const reflection = Math.min(100, ((answered + devolutions) / 10) * 100);
  const hasEvidence = E.length > 0 || answered > 0;
  let touched = 0; ACTIVITIES.forEach((a) => { for (let i = 0; i < LANE_COUNT[a]; i++) if (laneLengths(snap, a, i).length) touched++; });
  return {
    totalMoves: places.length + removes.length, placements: places.length, currentHits: hits, currentErrors: E.filter(isErr).length,
    reflections: reflectiveActs(snap).total, devolutions, answered,
    appropriation: hasEvidence ? Math.round(accuracy * 0.5 + efficiency * 0.25 + reflection * 0.25) : null,
    accuracy: Math.round(accuracy), efficiency: Math.round(efficiency), reflectionFactor: Math.round(reflection),
    totalLanes: TOTAL_LANES, lanesTouched: touched, hasEvidence,
  };
}

/** Barra «Devolución» del panel lateral. */
export const devolutionPct = (snap: Snapshot) => Math.round(Math.min(100, (computeStats(snap).currentHits / TOTAL_LANES) * 100 * 0.7 + Math.min(100, (computeStats(snap).devolutions / 6) * 100) * 0.3));
