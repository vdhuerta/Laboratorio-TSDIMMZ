import { INDICATORS } from '../config';
import type { AppReportIndicator } from '../types';
import { ACTIVITIES, FORMULATIONS_OFFERED, activeLanes, isLaneCorrect, laneCount, totalLanes } from '../data/lab';
import type { ActivityKey, LabEvent, Snapshot } from '../labTypes';
import { computeIndicators as computeIndicatorsCore, type IndicatorResult } from '../immz-core/compute';
import type { ImmzEvent } from '../immz-core/events';
import { categorize, computeIndices, diagnose } from './immz/scoring';

export type { IndicatorResult };

/**
 * TRADUCTOR DE LA INTERFAZ DEL LABORATORIO AL VOCABULARIO CANÓNICO immz-core (IMMZ 4.1)
 * ──────────────────────────────────────────────────────────────────────────────────────
 * Este archivo NO calcula ningún indicador: solo traduce la traza del Laboratorio a eventos canónicos y delega
 * en src/immz-core/ (copia idéntica de la del Simulador TSD; las fórmulas y constantes viven allí, no aquí).
 *
 *  · unidad       → un carril (escalón, vía o lado): «TSD1:6», «TSD2:0», «TSD3:3».
 *  · intento      → colocar o retirar una regleta en un carril.
 *                   place:  acierto = la pieza cabe en la meta, no arma un lado mal compuesto y (TSD 1) es la regleta del escalón.
 *                   remove: acierto = no se desarma un carril que estaba correcto (retirar es deshacer).
 *                   primerIntento = el primer intento que CIERRA el carril (`closes` en la traza: en TSD 1 toda regleta,
 *                   porque el escalón admite una sola; en TSD 2 y 3 la pieza que lo lleva a su meta o más allá):
 *                   es la primera vez que la estudiante «entrega» ese carril (IM9).
 *  · pausa        → tiempo entre dos intentos consecutivos de la misma actividad (IM1, IM2).
 *  · devolucion   → SOLO cuando la estudiante abre el panel de Devolución didáctica y la situación diagnosticada
 *                   tiene carril (retirar una pieza NO es consultar la devolución). Sin carril → no se emite.
 *  · revision     → NO se emite: immz-core la deriva (intento posterior a una devolución sobre la misma unidad).
 *  · fase         → cambio de TSD1/TSD2/TSD3, más la entrada a las fases «accion», «devolucion» y «formulacion».
 *  · redundante   → colocar una regleta y retirar de inmediato esa misma regleta del mismo carril.
 *  · formulacion  → la respuesta final de cada pregunta de formulación/anclaje, marcada correcta/incorrecta
 *                   contra sus términos clave (src/data/expected.ts). Caracteres y palabras viajan solo como dato.
 *  · juicio       → respuesta a «¿Crees que este carril está completo y correcto?» (IM11).
 */
export const unitId = (a: ActivityKey, idx: number) => `${a}:${idx}`;
const ORDER: Record<ActivityKey, number> = { TSD1: 1, TSD2: 2, TSD3: 3 };
const sortEv = (h: LabEvent[]) => h.slice().sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
const answerKey = (e: LabEvent): string => (e.payload?.key as string | undefined) ?? (e.payload?.bridge === true ? (e.activity === 'TSD2' ? 'tsd2Bridge' : 'tsd3Bridge') : `q${e.questionId}`);

export function toImmzEvents(snap: Snapshot, scope?: ActivityKey): ImmzEvent[] {
  const H = sortEv(scope ? snap.history.filter((e) => e.activity === scope) : snap.history);
  const out: ImmzEvent[] = [];
  const closed = new Set<string>();                         // unidades cuyo primer cierre ya ocurrió
  const prevTs: Partial<Record<ActivityKey, number>> = {};  // último intento por actividad
  const done = new Set<ActivityKey>(), acted = new Set<ActivityKey>(), helped = new Set<ActivityKey>(), formulated = new Set<ActivityKey>();
  const lastAnswer = new Map<string, LabEvent>();
  let orden = 0;
  const fase = (name: string, esSalto: boolean, ts: number) => out.push({ type: 'fase', fase: name, orden: ++orden, esSalto, ts });

  H.forEach((e, i) => {
    const p = e.payload ?? {};
    if ((e.type === 'place' || e.type === 'remove') && e.laneIndex !== undefined) {
      const unidad = unitId(e.activity, e.laneIndex);
      let acierto: boolean, primerIntento = false;
      if (e.type === 'place') {
        acierto = p.rejected !== true && p.isOverflow !== true && p.fits !== false && p.isWrong !== true;
        if (!closed.has(unidad) && p.closes === true) { closed.add(unidad); primerIntento = true; }   // `closes` lo declara la interfaz al colocar (ver App.place)
      } else acierto = p.wasIncorrect === true;               // retirar de un carril correcto lo desarma; en otro caso es deshacer
      if (!acted.has(e.activity) && e.type === 'place') { acted.add(e.activity); fase('accion', false, e.timestamp); }
      out.push({ type: 'intento', unidad, objetivo: String(p.target ?? ''), acierto, primerIntento, ts: e.timestamp });
      const pt = prevTs[e.activity]; if (pt !== undefined) out.push({ type: 'pausa', duracionMs: e.timestamp - pt, eventoSiguiente: unidad, ts: e.timestamp });
      prevTs[e.activity] = e.timestamp;
      const nx = H[i + 1];
      if (e.type === 'place' && p.rejected !== true && nx && nx.type === 'remove' && nx.activity === e.activity && nx.laneIndex === e.laneIndex && nx.rodLength === e.rodLength) out.push({ type: 'redundante', unidad, repeticiones: 2, ts: nx.timestamp });
    } else if (e.type === 'devolution_open') {
      if (!helped.has(e.activity)) { helped.add(e.activity); fase('devolucion', !acted.has(e.activity), e.timestamp); }
      if (typeof p.lane === 'number') out.push({ type: 'devolucion', unidad: unitId(e.activity, p.lane), origen: 'panel', ts: e.timestamp });
    } else if (e.type === 'devolution_request' && p.scope !== 'construction') {
      if (!helped.has(e.activity)) { helped.add(e.activity); fase('devolucion', !acted.has(e.activity), e.timestamp); }
    } else if (e.type === 'activity_complete') done.add(e.activity);
    else if (e.type === 'activity_switch') {
      const from = (p.from as ActivityKey | undefined) ?? e.activity;
      fase(e.activity, ORDER[e.activity] > ORDER[from] && !done.has(from), e.timestamp);
    } else if (e.type === 'question_answer' && p.empty !== true) {
      if (!formulated.has(e.activity)) { formulated.add(e.activity); fase('formulacion', e.activity !== 'TSD1' && !done.has(e.activity), e.timestamp); }
      lastAnswer.set(`${e.activity}|${answerKey(e)}`, e);
    } else if (e.type === 'judgment' && e.laneIndex !== undefined) {
      out.push({ type: 'juicio', unidad: unitId(e.activity, e.laneIndex), declarado: p.declared === true, real: p.real === true, ts: e.timestamp });
    }
  });
  lastAnswer.forEach((e) => out.push({ type: 'formulacion', referencia: answerKey(e), modo: 'texto', correcta: e.payload?.correcta === true, caracteres: Number(e.payload?.chars ?? 0), palabras: Number(e.payload?.words ?? 0), ts: e.timestamp }));
  return out.sort((a, b) => a.ts - b.ts);
}

/** Formulaciones que la forma (o la sesión) ofrece: denominador esperado de IM10. Solo se declara si hubo contacto con alguna. */
export function im10Target(snap: Snapshot, scope?: ActivityKey): Record<string, number> | undefined {
  const E = scope ? snap.history.filter((e) => e.activity === scope) : snap.history;
  const touched = E.some((e) => e.type === 'question_answer' || e.type === 'question_open' || e.type === 'anchor_open' || e.type === 'formulation_panel_open');
  if (!touched) return undefined;
  return { IM10: (scope ? [scope] : ACTIVITIES).reduce((n, a) => n + FORMULATIONS_OFFERED[a], 0) };
}

const band = (v: number | null, t: { hi: string; mid: string; low: string; none: string }) => (v === null ? t.none : v >= 80 ? t.hi : v >= 50 ? t.mid : t.low);

/** Retroalimentación cualitativa por indicador (tres bandas: ≥80, 50–79, <50). */
export const IM_TEXT: Record<string, { hi: string; mid: string; low: string; none: string }> = {
  IM1: { none: 'Sin evidencia suficiente para medir el ritmo de colocación.', hi: 'Ritmo de planificación reflexivo y autorregulado: cada regleta se coloca tras una pausa deliberada.', mid: 'Ritmo en desarrollo: alterna pausas deliberadas con colocaciones aceleradas.', low: 'Tiende a colocar regletas de forma impulsiva, sin pausar para analizar el espacio disponible.' },
  IM2: { none: 'Sin evidencia de manipulaciones sobre las que medir la reflexión.', hi: 'Utiliza activamente Experimenta, las preguntas y las devoluciones como instancias de detención reflexiva.', mid: 'Reflexión en progreso: consulta los apoyos, aunque predomina la manipulación directa.', low: 'Prioriza el ensayo mecánico directo sobre la exploración previa y los instrumentos de reflexión.' },
  IM3: { none: 'Sin evidencia de errores a corregir en esta sesión.', hi: 'Ante el error consulta la devolución didáctica y luego logra la configuración correcta.', mid: 'Corrige parte de sus errores: consulta la devolución o logra reparar, pero no siempre ambas.', low: 'Tras un error, ni consulta la devolución ni logra reparar la construcción: el desajuste queda sin resolver.' },
  IM4: { none: 'Sin evidencia: no se solicitaron devoluciones didácticas.', hi: 'Aplica activamente las pistas didácticas: tras cada devolución reajusta su acción o su escrito.', mid: 'Aprovecha parcialmente las devoluciones: algunas se traducen en un reajuste y otras no.', low: 'Consulta devoluciones pero no modifica su estrategia a continuación.' },
  IM5: { none: 'Sin evidencia de colocaciones erróneas de las que recuperarse.', hi: 'Persiste y reajusta de inmediato tras exceder la meta o componer mal un lado.', mid: 'Capacidad adaptativa aceptable: se recupera de algunos errores, no de todos.', low: 'Abandona o repite el mismo error tras exceder la capacidad del carril.' },
  IM6: { none: 'Sin evidencia de acciones sobre las que evaluar la secuencia didáctica.', hi: 'Respeta la secuencia adidáctica: actúa sobre el medio antes de pedir ayuda y formula después de construir.', mid: 'Alineación aceptable, con algún salto de fase (ayuda antes de actuar o formulación antes de construir).', low: 'Saltos de fase frecuentes: solicita devoluciones antes de actuar o formula sin haber construido.' },
  IM7: { none: 'Sin evidencia de colocaciones de regletas.', hi: 'Fluidez motora y baja carga cognitiva superflua: casi no coloca y retira de inmediato la misma pieza.', mid: 'Vacilación moderada: algunas piezas se colocan y se retiran enseguida.', low: 'Movimientos titubeantes repetidos en el mismo carril (coloca y retira la misma regleta).' },
  IM8: { none: 'Sin evidencia de colocaciones de regletas.', hi: 'Estima anticipadamente la longitud disponible antes de posicionar cada pieza.', mid: 'Ensayo y error moderado: conviven hipótesis válidas con piezas que exceden la meta.', low: 'Inserta piezas de dimensiones superiores al espacio remanente: ensayo sin anticipación.' },
  IM9: { none: 'Sin evidencia: aún no hay carriles completados correctamente.', hi: 'Planifica antes de ejecutar: resuelve los carriles con precisión en su primera configuración.', mid: 'Planificación inicial aceptable: parte de los carriles requirió ajustes sucesivos.', low: 'Requiere ajustes sucesivos (retiros o excesos) para lograr la suma deseada en cada carril.' },
  IM10: { none: 'Sin evidencia: aún no se responden preguntas de formulación o anclajes.', hi: 'Sus formulaciones y anclajes recogen los códigos esperados: nombra la regularidad, la unidad y la composición aditiva.', mid: 'Apropiación intermedia: parte de sus respuestas recoge los términos esperados y parte no.', low: 'Sus respuestas no recogen aún los términos esperados de la regularidad y la composición aditiva.' },
  IM11: { none: 'Sin evidencia de juicios (el juicio previo estuvo apagado, el ojo estaba activo o no se respondió ninguno).', hi: 'Calibración sobresaliente: anticipa con precisión si el carril está completo y correcto antes de comprobarlo.', mid: 'Calibración en desarrollo: su juicio acierta en la mayoría de los casos, con algunas sobre o subestimaciones.', low: 'Calibración inicial: lo que cree sobre sus carriles coincide poco con el resultado real.' },
};


/* ───────────── utilidades de lectura de la traza (descriptivas: no entran a ningún indicador) ───────────── */
export const TEST_EPISODE_GAP_MS = 60000; // piezas colocadas en Experimenta con menos de 60 s entre sí = un mismo episodio
export const MIN_ANSWER_CHARS = 25;       // habilitación de preguntas y acceso a TSD 2/3: una respuesta con contenido (≥25 caracteres)…
export const MIN_ANSWER_WORDS = 4;        // …y ≥4 palabras. Es una compuerta de navegación, NO mide IM10 (eso lo hace expected.ts)
export const substantive = (s: string | undefined) => { const t = (s ?? '').trim(); return t.length >= MIN_ANSWER_CHARS && t.split(/\s+/).filter(Boolean).length >= MIN_ANSWER_WORDS; };
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
  const devs = E.filter((e) => e.type === 'devolution_request' || e.type === 'devolution_open').length;
  const answered = promptKeys(scope).filter((k) => (snap.answers[k] ?? '').trim().length > 0).length;
  const episodes = testEpisodes(E);
  return { episodes, opened: opened.size, devs, answered, total: episodes + opened.size + devs + answered };
}

/* ───────────── los 11 indicadores: los calcula immz-core ───────────── */
export function computeIndicators(snap: Snapshot, scope?: ActivityKey): IndicatorResult[] {
  const rows = computeIndicatorsCore(toImmzEvents(snap, scope), im10Target(snap, scope));
  return rows.map((r) => ({ ...r, feedback: band(r.value, IM_TEXT[r.code]) }));
}

/** Modo de los actos de formulación (IM10) emitidos: en el Laboratorio siempre es 'texto'. null si no hubo ninguno. */
export function formulacionModo(snap: Snapshot): 'accion' | 'texto' | 'mixto' | null {
  const modos = new Set(toImmzEvents(snap).filter((e) => e.type === 'formulacion').map((e) => (e as { modo: string }).modo));
  return modos.size === 0 ? null : modos.size > 1 ? 'mixto' : ([...modos][0] as 'accion' | 'texto');
}

/* ───────────── enlace con el scoring del Diario ───────────── */
export function toReportIndicators(res: IndicatorResult[]): AppReportIndicator[] {
  return INDICATORS.map((d) => { const v = res.find((r) => r.code === d.id)?.value ?? null; const level = categorize(v); return { id: d.id, value: v, level, diagnosis: diagnose(v, level) }; });
}
/** Índices con el MISMO scoring que usa el Diario (media simple con 1 decimal; null no cuenta). Con IM11 incluido (motor 4.1). */
export const indicesOf = (res: IndicatorResult[]) => computeIndices(toReportIndicators(res));

/* ───────────── estado de la construcción y apropiación ───────────── */
export const laneLengths = (snap: Snapshot, a: ActivityKey, i: number) => (snap.lanes[a]?.[i] ?? []).map((r) => r.length);
export function correctLanes(snap: Snapshot, a?: ActivityKey): number {
  let n = 0;
  (a ? [a] : ACTIVITIES).forEach((act) => { activeLanes(act, snap.config).forEach((i) => { if (isLaneCorrect(act, i, laneLengths(snap, act, i), snap.config)) n++; }); });
  return n;
}
export const stageProgress = (snap: Snapshot, a: ActivityKey) => Math.round((correctLanes(snap, a) / laneCount(a, snap.config)) * 100);
export const activityComplete = (snap: Snapshot, a: ActivityKey) => correctLanes(snap, a) === laneCount(a, snap.config);

export interface SessionStats {
  totalMoves: number; placements: number; currentHits: number; currentErrors: number; reflections: number; devolutions: number; answered: number;
  appropriation: number | null; accuracy: number; efficiency: number; reflectionFactor: number;
  totalLanes: number; lanesTouched: number; hasEvidence: boolean;
}

export function computeStats(snap: Snapshot): SessionStats {
  const E = snap.history;
  const places = E.filter((e) => e.type === 'place');
  const removes = E.filter((e) => e.type === 'remove');
  const hits = correctLanes(snap), total = totalLanes(snap.config);
  // Piezas que quedaron en carriles correctos ÷ colocaciones intentadas
  let kept = 0; ACTIVITIES.forEach((a) => activeLanes(a, snap.config).forEach((i) => { if (isLaneCorrect(a, i, laneLengths(snap, a, i), snap.config)) kept += laneLengths(snap, a, i).length; }));
  const accuracy = Math.min(100, (hits / total) * 100);
  const efficiency = places.length > 0 ? Math.min(100, (kept / places.length) * 100) : 0;
  const answered = promptKeys().filter((k) => (snap.answers[k] ?? '').trim().length > 0).length;
  const devolutions = E.filter((e) => e.type === 'devolution_request').length;
  const reflection = Math.min(100, ((answered + devolutions) / 10) * 100);
  const hasEvidence = E.length > 0 || answered > 0;
  let touched = 0; ACTIVITIES.forEach((a) => activeLanes(a, snap.config).forEach((i) => { if (laneLengths(snap, a, i).length) touched++; }));
  return {
    totalMoves: places.length + removes.length, placements: places.length, currentHits: hits, currentErrors: E.filter(isErr).length,
    reflections: reflectiveActs(snap).total, devolutions, answered,
    appropriation: hasEvidence ? Math.round(accuracy * 0.5 + efficiency * 0.25 + reflection * 0.25) : null,
    accuracy: Math.round(accuracy), efficiency: Math.round(efficiency), reflectionFactor: Math.round(reflection),
    totalLanes: total, lanesTouched: touched, hasEvidence,
  };
}

/** Barra «Devolución» del panel lateral. */
export const devolutionPct = (snap: Snapshot) => { const s = computeStats(snap); return Math.round(Math.min(100, (s.currentHits / s.totalLanes) * 100 * 0.7 + Math.min(100, (s.devolutions / 6) * 100) * 0.3)); };
