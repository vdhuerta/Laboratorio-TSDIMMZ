import { INDICATORS } from '../../config';
import type { AppReportIndicator, ImmzCategory } from '../../types';

export function categorize(v: number | null): ImmzCategory | null {
  if (v === null || Number.isNaN(v)) return null;
  if (v < 40) return 'Inicial';
  if (v < 60) return 'En Desarrollo';
  if (v < 80) return 'Competente';
  return 'Avanzado';
}

/** Media aritmética de los indicadores con evidencia (los `null` se excluyen, nunca cuentan como 0).
 *  Es la regla del sistema original: los índices de los reportes reales coinciden con esta media simple. */
export function meanOf(inds: AppReportIndicator[], ids: string[]): number | null {
  const v = ids.map((id) => inds.find((i) => i.id === id)?.value).filter((x): x is number => typeof x === 'number');
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
}
export const weightedAvg = meanOf;

const ids = (sub: string[]) => INDICATORS.filter((i) => sub.includes(i.sub)).map((i) => i.id);

export function computeIndices(inds: AppReportIndicator[]) {
  const immzAO = meanOf(inds, ids(['AO']));
  const immzAC = meanOf(inds, ids(['AC']));
  const immz = meanOf(inds, ids(['AO', 'AC']));
  const idcd = meanOf(inds, ids(['IDCD']));
  const immg = meanOf(inds, INDICATORS.map((i) => i.id));
  return { immzAO, immzAC, immz, idcd, immg, category: categorize(immg) };
}

const DIAG: Record<ImmzCategory, string> = {
  Inicial: 'Conducta incipiente: requiere andamiaje explícito y práctica guiada.',
  'En Desarrollo': 'Aparece de forma intermitente; consolidar con rutinas de autorregulación.',
  Competente: 'Desempeño consistente y funcional en la mayoría de las situaciones.',
  Avanzado: 'Dominio estratégico; transfiere y anticipa con autonomía.',
};

export function diagnose(value: number | null, level: ImmzCategory | null): string {
  if (value === null || !level) return 'Sin dato en el reporte cargado.';
  return DIAG[level];
}
