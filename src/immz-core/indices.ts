import type { IndicatorResult } from './compute';

/** Mismos cortes que lib/immz/scoring.ts del Diario (4 niveles). Duplicado a propósito:
 *  immz-core no importa nada fuera de sí mismo para poder copiarse íntegro a las otras apps. */
export type ImmzCategory = 'Inicial' | 'En Desarrollo' | 'Competente' | 'Avanzado';
export function categorize(v: number | null): ImmzCategory | null {
  if (v === null || Number.isNaN(v)) return null;
  if (v < 40) return 'Inicial';
  if (v < 60) return 'En Desarrollo';
  if (v < 80) return 'Competente';
  return 'Avanzado';
}

/** Media simple, 1 decimal; los indicadores sin evidencia (null) se excluyen y nunca cuentan como 0. */
function meanOf(results: IndicatorResult[], codes: string[]): number | null {
  const v = codes.map((c) => results.find((r) => r.code === c)?.value).filter((x): x is number => typeof x === 'number');
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
}

const AO = ['IM1', 'IM2', 'IM11'];
const AC = ['IM3', 'IM4', 'IM5'];
const IDCD_IDS = ['IM6', 'IM7', 'IM8', 'IM9', 'IM10'];
const ALL = [...AO, ...AC, ...IDCD_IDS];

export interface Immz41Indices { immzAO: number | null; immzAC: number | null; immz: number | null; idcd: number | null; immg: number | null; category: ImmzCategory | null }

/** IMMZ 4.1: IMMZ-AO = IM1,IM2,IM11 · IMMZ-AC = IM3,IM4,IM5 · IMMZ = AO∪AC · IDCD = IM6..IM10 · IMMG = IM1..IM11. */
export function computeIndices(results: IndicatorResult[]): Immz41Indices {
  const immzAO = meanOf(results, AO);
  const immzAC = meanOf(results, AC);
  const immz = meanOf(results, [...AO, ...AC]);
  const idcd = meanOf(results, IDCD_IDS);
  const immg = meanOf(results, ALL);
  return { immzAO, immzAC, immz, idcd, immg, category: categorize(immg) };
}
