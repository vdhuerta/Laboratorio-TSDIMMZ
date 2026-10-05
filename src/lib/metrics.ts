import type { Card } from '../data/cards';
import { INDICATORS } from '../config';
import type { AppReportIndicator } from '../types';
import { categorize, computeIndices, diagnose } from './immz/scoring';
import { REDUNDANCY_THRESHOLD } from '../immz-core/constants';
import { computeIndicators as computeIndicatorsCore, type IndicatorResult as CoreIndicatorResult } from '../immz-core/compute';
import type { ImmzEvent } from '../immz-core/events';

/** Tablero: 'available' + una lista por fase. */
export type Board = Record<string, Card[]>;

/** Traza cruda de la sesión. Cada evento es una observación de conducta del estudiante.
 *  'judgment' solo se registra si la estudiante respondió el modal de juicio (IM11); cerrar
 *  el modal sin responder deja el 'move' igual, pero no genera 'judgment'. */
export type HistoryEvent =
  | { type: 'move'; cardId: string; cardContent: string; from: string; to: string; isCorrect: boolean; timestamp: number }
  | { type: 'analysis'; cardId: string; cardContent: string; timestamp: number }
  | { type: 'judgment'; cardId: string; declared: boolean; real: boolean; timestamp: number };

export interface IndicatorResult {
  code: string;            // IM1…IM11 (IM1–IM10 esquema canónico 4.0 del Diario; IM11 es extensión 4.1)
  value: number | null;    // 0–100 entero; null = sin evidencia (nunca cuenta como 0)
  numerator: number | null;
  denominator: number;     // tamaño de la evidencia (0 → null)
  formula: string;
  feedback: string;
}

export interface SessionStats {
  totalMoves: number; currentHits: number; currentErrors: number; analyses: number;
  appropriation: number | null; accuracy: number; efficiency: number; reflectionFactor: number;
  totalCards: number; itemsAssigned: number; hasEvidence: boolean;
}

const band = (v: number | null, hi: string, mid: string, low: string, none: string) => (v === null ? none : v >= 80 ? hi : v >= 50 ? mid : low);

/** Textos por indicador (copiados del simulador original; solo cambia el código, ahora canónico).
 *  IM1–IM10: NO SE TOCAN. IM11 es nuevo (motor 4.1, calibración del juicio metacognitivo). */
export const IM_TEXT: Record<string, { basis: string; description: string; hi: string; mid: string; low: string; none: string }> = {
  IM1: { basis: 'Zimmerman & Moylan (2009) — Fase de Ejecución: Auto-observación', description: 'Mide la autorregulación del tiempo entre acciones. Valores altos indican que el alumno no responde con impulsividad y se detiene a pensar antes de mover cada tarjeta.', none: 'Sin evidencia suficiente para medir el ritmo reflexivo.', hi: 'Excelente vigilancia del ritmo cognitivo. No hay indicios de impulsividad o respuestas fortuitas.', mid: 'Ritmo cognitivo en desarrollo. El estudiante muestra regularidad, aunque con momentos de respuesta acelerada sin planificación.', low: 'Nivel inicial. Alta tendencia a la respuesta inmediata o impulsiva (ensayo y error ciego) sin mediación de reflexión.' },
  IM2: { basis: 'Brousseau — Devolución y análisis teórico', description: 'Proporción de unidades de trabajo en las que hubo al menos un acto de detención reflexiva (consulta de devolución o pausa larga).', none: 'Sin evidencia de unidades de trabajo abordadas aún.', hi: 'Comportamiento altamente reflexivo. El alumno equilibra de forma excelente la acción práctica con la teoría del aprendizaje.', mid: 'Reflexión en progreso. Hay un balance aceptable, pero prevalece la tendencia a actuar sobre la tendencia a analizar.', low: 'Acción sobrepasando a la reflexión. El estudiante interactúa mecánicamente con el milieu sin detenerse a conceptualizar.' },
  IM3: { basis: 'Zimmerman & Moylan (2009) — Fase de Ejecución: Autocontrol', description: 'Capacidad de identificar y reparar un error tras recibir la devolución del milieu sin deambular de forma aleatoria por otras fases.', none: 'Sin evidencia de errores cometidos aún.', hi: 'Gran madurez en la asimilación del error. El estudiante lee la devolución didáctica y ajusta su esquema de inmediato.', mid: 'Capacidad de enmienda en progreso. Se corrigen los errores, pero se requiere más de un intento errático antes de dar con la fase correcta.', low: 'Nivel inicial. Dificultad para interpretar las devoluciones del sistema, lo que genera confusión de descarte ante el obstáculo.' },
  IM4: { basis: 'Zimmerman & Moylan (2009) — Fase de Ejecución: Autocontrol', description: 'Nivel de aprovechamiento real de las devoluciones: proporción de consultas que fueron seguidas de un nuevo intento sobre la misma tarjeta dentro de los 5 minutos siguientes.', none: 'Sin evidencia de devoluciones consultadas aún.', hi: 'Uso sobresaliente de la retroalimentación. El participante vuelve sobre la tarjeta y aplica lo leído casi siempre.', mid: 'Interacción parcial con el feedback. A veces se vuelve sobre la tarjeta tras leer la devolución, pero no siempre.', low: 'Lectura de devoluciones sin aplicación. El estudiante consulta la devolución pero rara vez vuelve sobre esa tarjeta después.' },
  IM5: { basis: 'Panadero & Alonso-Tapia (2014) — Ciclo Adaptativo post-error', description: 'Capacidad de reaccionar de manera inmediata y asertiva después de cometer un error en esa misma tarjeta.', none: 'Sin evidencia de errores cometidos aún.', hi: 'Resiliencia cognitiva sobresaliente. Un error es tomado inmediatamente como una oportunidad para reorganizar la lógica y acertar.', mid: 'Capacidad adaptativa aceptable. El error desestabiliza levemente, pero el participante logra recuperarse tras unos instantes.', low: 'Frustración o persistencia en el error. Un fallo desencadena una serie de movimientos erróneos consecutivos o abandono reflexivo.' },
  IM6: { basis: 'Brousseau — Preservación de la situación adidáctica', description: 'Proporción de transiciones de fase que respetan el orden didáctico (sin institucionalización prematura del saber).', none: 'Sin evidencia de transiciones de fase aún.', hi: 'Respeto absoluto por el tiempo didáctico del alumno. Las fases de exploración e intercambio preceden a la formalización.', mid: 'Alineación didáctica aceptable, aunque se observan intentos tempranos de formalización cuando la exploración aún está inmadura.', low: 'Deslizamiento metadidáctico severo. Se intenta forzar la fase de institucionalización del saber sin haber consolidado la acción libre.' },
  IM7: { basis: 'Zimmerman & Moylan (2009) — Fase de Ejecución: Auto-observación', description: 'Proporción de intentos sin redundancia (sin arrastrar la misma tarjeta de un lado a otro repetidamente).', none: 'Sin evidencia de intentos realizados aún.', hi: 'Excelente economía cognitiva. El alumno realiza movimientos firmes y seguros, lo que denota una clara estructuración mental.', mid: 'Duda o vacilación moderada. Algunas tarjetas sufren movimientos repetidos antes de encontrar su destino definitivo.', low: 'Sobrecarga cognitiva o tanteo errático severo. Arrastre repetitivo de las mismas tarjetas, reflejando desconexión didáctica.' },
  IM8: { basis: 'Brousseau — Interacción racional con el milieu', description: 'Eficiencia empírica. Compara los movimientos acertados sobre el total, evaluando si los intentos tienen lógica matemática.', none: 'Sin evidencia de movimientos realizados aún.', hi: 'Alto índice de precisión racional. Casi todas las hipótesis y deducciones del alumno resultan ser correctas.', mid: 'Ensayo y error moderado. Se formulan hipótesis válidas pero conviven con un porcentaje relevante de equivocaciones de tanteo.', low: 'Tanteo puramente aleatorio. Los movimientos no siguen una lógica didáctica estructurada y se basan en el azar.' },
  IM9: { basis: 'Brousseau — Modelo mental pre-acción sobre el milieu', description: 'Tasa de éxito al primer intento sobre las unidades abordadas. Refleja la solidez del análisis pre-tarea antes de someter las tarjetas al milieu.', none: 'Sin evidencia de tarjetas abordadas aún.', hi: 'Nivel maduro de planificación cognitiva. El estudiante posee un modelo conceptual muy robusto antes de actuar.', mid: 'Planificación inicial aceptable. Se comprende la estructura a grandes rasgos, aunque persisten vacíos de lógica didáctica.', low: 'Deficiencia en la planificación previa. El alumno arrastra tarjetas sin un análisis conceptual anterior que sustente la acción.' },
  IM10: { basis: 'Brousseau — Fase de formulación y lenguaje', description: 'Apropiación del registro de formulación: la proporción de actos de formulación correctos, ya sea una respuesta escrita o una acción verificable (en este simulador, ubicar la tarjeta en la columna Formulación).', none: 'Esta sesión no presentó ningún acto de formulación verificable.', hi: 'Perfecto dominio del lenguaje de formulación y su rol mediador. Se asimila plenamente la función de los códigos comunes.', mid: 'Apropiación intermedia. Se comprende la necesidad de registrar y verbalizar, pero se confunde con la simple manipulación inicial.', low: 'Incomprensión de la fase de formulación. No se distingue el registro formal del juego autónomo o del debate de validación.' },
  IM11: { basis: 'Calibración metacognitiva (juicio declarado vs. desempeño real)', description: 'Proporción de tarjetas en las que el juicio declarado por la estudiante antes de validar ("¿crees que está en la fase correcta?") coincidió con el resultado real.', none: 'Sin evidencia de juicios registrados aún (el modal de calibración estuvo apagado o no se respondió ninguno).', hi: 'Calibración metacognitiva sobresaliente. La estudiante anticipa con precisión si su decisión es correcta antes de confirmarla.', mid: 'Calibración en desarrollo. El juicio previo acierta en la mayoría de los casos, pero persisten sobreestimaciones o dudas.', low: 'Calibración inicial. El juicio declarado coincide poco con el resultado real: hay sobreconfianza o subestimación sistemática.' },
};

/** Ícono/nombre corto por indicador para la UI. */
export const IM_SHORT: Record<string, string> = { IM1: 'Vigilancia', IM2: 'Detención reflexiva', IM3: 'Autocorrección', IM4: 'Retroalimentación', IM5: 'Resiliencia', IM6: 'Secuencia', IM7: 'Carga cognitiva', IM8: 'Ensayo y error', IM9: 'Predicción', IM10: 'Formulación', IM11: 'Calibración del juicio' };

/**
 * Traduce la traza del Simulador al vocabulario canónico immz-core.
 * Una tarjeta es una "unidad". 'move' → 'intento'; 'analysis' → 'devolucion'.
 * 'pausa' se deriva entre 'intento' consecutivos (el ritmo de manipulación no se
 * contamina con el tiempo que toma leer una devolución o responder el juicio).
 * 'redundante' se emite desde el movimiento que supera REDUNDANCY_THRESHOLD en una tarjeta.
 * 'fase' se emite en cada cambio de columna, con esSalto si institucionaliza con <6
 * tarjetas distintas previas en acción/formulación.
 * 'formulacion' (IM10, en el sentido de Brousseau: registro del saber verificable, no
 * necesariamente escrito): cada movimiento hacia la columna Formulación emite un acto con
 * modo 'accion' — correcta = la tarjeta queda en su fase correcta.
 * 'revision' (IM4) ya NO se emite aquí: immz-core la deriva internamente de 'intento' +
 * 'devolucion' (ver events.ts/compute.ts) para que ninguna app tenga que reinventarla.
 * 'juicio' viene directo de los eventos 'judgment' (modal de calibración, Tarea 4).
 */
export function toImmzEvents(history: HistoryEvent[]): ImmzEvent[] {
  const events: ImmzEvent[] = [];
  const seenCard = new Set<string>();
  const movesPerCard: Record<string, number> = {};
  let prevActionTs: number | null = null;
  const institUnitsPrev = new Set<string>();

  for (const h of history) {
    if (h.type === 'move') {
      const primerIntento = !seenCard.has(h.cardId); seenCard.add(h.cardId);
      events.push({ type: 'intento', unidad: h.cardId, objetivo: h.to, acierto: h.isCorrect, primerIntento, ts: h.timestamp });

      if (prevActionTs !== null) events.push({ type: 'pausa', duracionMs: h.timestamp - prevActionTs, eventoSiguiente: h.cardId, ts: h.timestamp });
      prevActionTs = h.timestamp;

      movesPerCard[h.cardId] = (movesPerCard[h.cardId] ?? 0) + 1;
      if (movesPerCard[h.cardId] > REDUNDANCY_THRESHOLD) events.push({ type: 'redundante', unidad: h.cardId, repeticiones: movesPerCard[h.cardId], ts: h.timestamp });

      const esSalto = h.to === 'institutionalization' && institUnitsPrev.size < 6;
      events.push({ type: 'fase', fase: h.to, orden: events.filter((e) => e.type === 'fase').length + 1, esSalto, ts: h.timestamp });
      if (h.to === 'action' || h.to === 'formulation') institUnitsPrev.add(h.cardId);

      if (h.to === 'formulation') events.push({ type: 'formulacion', referencia: h.cardId, modo: 'accion', correcta: h.isCorrect, ts: h.timestamp });
    } else if (h.type === 'analysis') {
      events.push({ type: 'devolucion', unidad: h.cardId, origen: 'lupa', ts: h.timestamp });
    } else if (h.type === 'judgment') {
      events.push({ type: 'juicio', unidad: h.cardId, declarado: h.declared, real: h.real, ts: h.timestamp });
    }
  }
  return events;
}

/** Delega el cálculo en immz-core y le pone el texto cualitativo de esta app (IM_TEXT/band, sin cambios). */
export function computeIndicators(history: HistoryEvent[], _board?: Board): IndicatorResult[] {
  const rows: CoreIndicatorResult[] = computeIndicatorsCore(toImmzEvents(history));
  return rows.map((r) => { const t = IM_TEXT[r.code]; return { ...r, feedback: band(r.value, t.hi, t.mid, t.low, t.none) }; });
}

/** Modo(s) de los actos de formulación (IM10) emitidos en la sesión — para el campo im10_modo
 *  del payload 4.1: permite comparar, con datos reales, si IM10 se comporta igual en 'accion'
 *  que en 'texto' entre las 5 apps. null si no hubo ningún acto de formulación. */
export function formulacionModo(history: HistoryEvent[]): 'accion' | 'texto' | 'mixto' | null {
  const modos = new Set(toImmzEvents(history).filter((e) => e.type === 'formulacion').map((e) => e.modo));
  if (modos.size === 0) return null;
  if (modos.size > 1) return 'mixto';
  return [...modos][0];
}

/** Indicadores en el formato exacto que consume el Diario (IM1–IM10; IM11 queda con value=null si el Diario
 *  aún no lo conoce, pero NUNCA se envía en el bloque de compatibilidad — ver immzReport.ts). */
export function toReportIndicators(res: IndicatorResult[]): AppReportIndicator[] {
  return INDICATORS.map((d) => {
    const v = res.find((r) => r.code === d.id)?.value ?? null;
    const level = categorize(v);
    return { id: d.id, value: v, level, diagnosis: diagnose(v, level) };
  });
}

/** Índices con el MISMO scoring que usa el Diario (media simple con 1 decimal; null no cuenta).
 *  Como config.ts ahora declara IM11 (sub 'AO'), este cálculo YA incluye IM11 — es el que se
 *  usa para la pantalla (motor 4.1). El payload de compatibilidad 4.0 usa una versión filtrada,
 *  ver computeCompatIndices() en immzReport.ts. */
export const indicesOf = (res: IndicatorResult[]) => computeIndices(toReportIndicators(res));

export function computeStats(history: HistoryEvent[], board: Board): SessionStats {
  const moves = history.filter((h) => h.type === 'move');
  const analyses = history.filter((h) => h.type === 'analysis');
  let hits = 0, errors = 0;
  Object.entries(board).forEach(([phase, cards]) => { if (phase === 'available') return; cards.forEach((c) => (c.correctPhase === phase ? hits++ : errors++)); });
  // Total de tarjetas de la forma activa: la suma de todas las columnas del tablero (available +
  // las 4 fases) siempre da el mazo completo, sea cual sea la forma (A/B/C) — las tres tienen 16.
  const total = Object.values(board).reduce((s, cs) => s + cs.length, 0);
  const accuracy = total > 0 ? Math.min(100, (hits / total) * 100) : 0;
  const efficiency = moves.length > 0 ? Math.min(100, (hits / moves.length) * 100) : 0;
  const reflection = Math.min(100, (analyses.length / total) * 100);
  const hasEvidence = moves.length > 0 || analyses.length > 0;
  return {
    totalMoves: moves.length, currentHits: hits, currentErrors: errors, analyses: analyses.length,
    appropriation: hasEvidence ? Math.round(accuracy * 0.5 + efficiency * 0.25 + reflection * 0.25) : null,
    accuracy: Math.round(accuracy), efficiency: Math.round(efficiency), reflectionFactor: Math.round(reflection),
    totalCards: total, itemsAssigned: total - (board.available?.length ?? 0), hasEvidence,
  };
}

/** Barra "Devolución" del panel lateral (misma fórmula del original: 70 % aciertos + 30 % exploración). */
export function devolutionPct(board: Board, analyzed: number): number {
  const total = Object.values(board).reduce((s, cs) => s + cs.length, 0);
  const assigned = total - (board.available?.length ?? 0);
  if (total === 0 || assigned === 0) return 0;
  let ok = 0;
  Object.entries(board).forEach(([p, cs]) => { if (p !== 'available') ok += cs.filter((c) => c.correctPhase === p).length; });
  return Math.round((ok / total) * 100 * 0.7 + Math.min(100, (analyzed / total) * 100) * 0.3);
}
