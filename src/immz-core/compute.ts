import { PAUSE_MIN_MS, PAUSE_MAX_MS, UPTAKE_WINDOW_MS } from './constants';
import { type DevolucionEvent, type ImmzEvent, type IntentoEvent, type OpportunityTarget, type RevisionEvent, isIntento, isPausa, isDevolucion, isRevision, isFase, isRedundante, isFormulacion, isJuicio } from './events';

/** Misma forma que el IndicatorResult de cada app, para no romper quien ya lo consume.
 *  `feedback` queda vacío aquí: el texto cualitativo (IM_TEXT/band) lo decide cada app. */
export interface IndicatorResult {
  code: string;
  value: number | null;
  numerator: number | null;
  denominator: number;
  formula: string;
  feedback: string;
}

const pct = (n: number, d: number) => Math.round((n / d) * 100);
const row = (code: string, value: number | null, numerator: number | null, denominator: number, formula: string): IndicatorResult =>
  ({ code, value, numerator, denominator, formula, feedback: '' });

/** Agrupa intentos por unidad, en orden cronológico. */
function byUnit(intentos: IntentoEvent[]): Map<string, IntentoEvent[]> {
  const m = new Map<string, IntentoEvent[]>();
  for (const i of intentos) {
    const list = m.get(i.unidad);
    if (list) list.push(i); else m.set(i.unidad, [i]);
  }
  for (const list of m.values()) list.sort((a, b) => a.ts - b.ts);
  return m;
}

/**
 * Deriva 'revision' automáticamente a partir de 'intento' + 'devolucion' (ver la regla canónica
 * documentada en events.ts). Las apps NO necesitan emitir 'revision': cada intento que llega
 * después de una devolución sobre la misma unidad genera aquí una revisión.
 */
function deriveRevisiones(units: Map<string, IntentoEvent[]>, devoluciones: DevolucionEvent[]): RevisionEvent[] {
  const revisiones: RevisionEvent[] = [];
  for (const [unidad, list] of units) {
    const devs = devoluciones.filter((d) => d.unidad === unidad).sort((a, b) => a.ts - b.ts);
    if (!devs.length) continue;
    for (const intento of list) {
      let lastDev: DevolucionEvent | undefined;
      for (const d of devs) { if (d.ts < intento.ts) lastDev = d; else break; }
      if (!lastDev) continue;
      const prevIntento = [...list].reverse().find((i) => i.ts < lastDev!.ts);
      revisiones.push({ type: 'revision', unidad, trasDevolucion: true, trasError: prevIntento ? !prevIntento.acierto : false, latenciaMs: intento.ts - lastDev.ts, ts: intento.ts });
    }
  }
  return revisiones;
}

export function computeIndicators(events: ImmzEvent[], target?: OpportunityTarget): IndicatorResult[] {
  const intentos = events.filter(isIntento);
  const pausas = events.filter(isPausa);
  const devoluciones = events.filter(isDevolucion);
  const fases = events.filter(isFase);
  const redundantes = events.filter(isRedundante);
  const formulaciones = events.filter(isFormulacion);
  const juicios = events.filter(isJuicio);
  const units = byUnit(intentos);
  const unidadesAbordadas = [...units.keys()];
  // 'revision' se deriva aquí mismo (intento + devolucion); si la app igual emitió revisiones
  // explícitas (señal propia más rica), se agregan — nunca reemplazan a las derivadas.
  const revisiones = [...events.filter(isRevision), ...deriveRevisiones(units, devoluciones)];

  // IM1 · pausas reflexivas (5–60 s) ÷ intervalos entre intentos
  const im1Den = intentos.length - 1;
  const im1Num = pausas.filter((p) => p.duracionMs >= PAUSE_MIN_MS && p.duracionMs <= PAUSE_MAX_MS).length;
  const im1 = row('IM1', im1Den >= 1 ? pct(im1Num, im1Den) : null, im1Num, Math.max(0, im1Den), 'pausas de 5–60 s ÷ intervalos entre intentos');

  // IM2 · unidades con devolución o pausa larga asociada ÷ unidades abordadas
  const unidadesConActoReflexivo = unidadesAbordadas.filter((u) => devoluciones.some((d) => d.unidad === u) || pausas.some((p) => p.duracionMs >= PAUSE_MIN_MS && p.eventoSiguiente === u));
  const im2 = row('IM2', unidadesAbordadas.length ? pct(unidadesConActoReflexivo.length, unidadesAbordadas.length) : null, unidadesConActoReflexivo.length, unidadesAbordadas.length, 'unidades con devolución o pausa larga asociada ÷ unidades abordadas');

  // IM3 · por unidad con error: 50 si hubo devolución tras el error + 50 si el intento siguiente en esa unidad acierta
  let im3Cards = 0, im3Score = 0;
  for (const [u, list] of units) {
    const firstErr = list.find((i) => !i.acierto);
    if (!firstErr) continue;
    im3Cards++;
    if (devoluciones.some((d) => d.unidad === u && d.ts > firstErr.ts)) im3Score += 50;
    if (list.some((i) => i.ts > firstErr.ts && i.acierto)) im3Score += 50;
  }
  const im3 = row('IM3', im3Cards > 0 ? Math.round(im3Score / im3Cards) : null, im3Score, im3Cards, 'por unidad con error: 50 si hubo devolución después + 50 si el intento siguiente acierta; promedio');

  // IM4 · devoluciones seguidas de una revisión en la misma unidad dentro de la ventana ÷ total de devoluciones
  const im4Num = devoluciones.filter((d) => revisiones.some((r) => r.unidad === d.unidad && r.ts >= d.ts && r.ts - d.ts <= UPTAKE_WINDOW_MS)).length;
  const im4 = row('IM4', devoluciones.length > 0 ? pct(im4Num, devoluciones.length) : null, im4Num, devoluciones.length, 'devoluciones con revisión asociada (≤ 5 min) ÷ devoluciones');

  // IM5 · errores seguidos de un acierto en la MISMA unidad ÷ total de errores (nunca 100 por ausencia de errores)
  let im5Den = 0, im5Num = 0;
  for (const [, list] of units) for (let i = 0; i < list.length - 1; i++) if (!list[i].acierto) { im5Den++; if (list[i + 1].acierto) im5Num++; }
  const im5 = row('IM5', im5Den > 0 ? pct(im5Num, im5Den) : null, im5Num, im5Den, 'errores seguidos de un acierto en la misma unidad ÷ errores');

  // IM6 · proporción de transiciones de fase sin salto
  const saltos = fases.filter((f) => f.esSalto).length;
  const im6 = row('IM6', fases.length > 0 ? Math.round(100 * (1 - saltos / fases.length)) : null, fases.length - saltos, fases.length, '100 × (1 − transiciones con salto ÷ transiciones totales)');

  // IM7 · proporción de intentos SIN redundancia (NO es penalización por conteo)
  const im7 = row('IM7', intentos.length > 0 ? Math.round(100 * (1 - redundantes.length / intentos.length)) : null, intentos.length - redundantes.length, intentos.length, '100 × (1 − eventos redundantes ÷ intentos totales)');

  // IM8 · intentos correctos ÷ intentos totales
  const im8Hits = intentos.filter((i) => i.acierto).length;
  const im8 = row('IM8', intentos.length > 0 ? pct(im8Hits, intentos.length) : null, im8Hits, intentos.length, 'intentos correctos ÷ intentos totales');

  // IM9 · unidades acertadas al primer intento ÷ unidades ABORDADAS
  const im9Hits = unidadesAbordadas.filter((u) => units.get(u)!.find((i) => i.primerIntento)?.acierto).length;
  const im9 = row('IM9', unidadesAbordadas.length ? pct(im9Hits, unidadesAbordadas.length) : null, im9Hits, unidadesAbordadas.length, 'unidades acertadas al primer intento ÷ unidades abordadas');

  // IM10 · actos de formulación correctos ÷ actos esperados (modo 'accion' o 'texto', el canal no
  // importa: lo que cuenta es que el acto sea verificable). null solo si la app no presentó
  // registro de formulación (sin target y sin eventos 'formulacion').
  const im10Expected = target?.IM10 ?? formulaciones.length;
  const im10Hits = formulaciones.filter((f) => f.correcta).length;
  const im10 = row('IM10', im10Expected > 0 ? pct(im10Hits, im10Expected) : null, im10Hits, im10Expected, 'actos de formulación correctos ÷ actos esperados (acción o texto)');

  // IM11 · juicios calibrados (declarado === real) ÷ juicios emitidos
  const im11Hits = juicios.filter((j) => j.declarado === j.real).length;
  const im11 = row('IM11', juicios.length > 0 ? pct(im11Hits, juicios.length) : null, im11Hits, juicios.length, 'juicios con declarado = real ÷ juicios emitidos');

  return [im1, im2, im3, im4, im5, im6, im7, im8, im9, im10, im11];
}
