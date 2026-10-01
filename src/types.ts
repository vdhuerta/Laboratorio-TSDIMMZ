// Tipos idénticos a los del Diario de Campo (src/types.ts): el reporte se lee con ellos.
export type ImmzCategory = 'Inicial' | 'En Desarrollo' | 'Competente' | 'Avanzado';
export interface CanonicalIndicatorDef {
  id: string; dimension: 'A' | 'B'; sub: 'AO' | 'AC' | 'IDCD'; label: string; description: string; weight: number; aliases: string[];
}
export interface AppReportIndicator { id: string; value: number | null; level: ImmzCategory | null; diagnosis: string }
export interface AppReportParsed {
  sourceVersion: string; version: 'V4'; simulator: string; scenarioName?: string | null; classNumber: number | null; studentName: string; generatedAt: string;
  indicators: AppReportIndicator[]; immzAO: number | null; immzAC: number | null; immz: number | null; idcd: number | null; immg: number | null;
  category: ImmzCategory | null; warnings: string[]; fileName?: string;
  /** Métricas del simulador (solo reportes migrados o con contrato): apropiación en %, conteos y modo de lectura. */
  apropiacion?: number | null; aciertos?: number; errores?: number; reflexiones?: number; parsingMode?: 'contract' | 'legacy'; qualitativeSummary?: string;
  /** Trazabilidad de la resolución de la aplicación (respaldo de la app original). */
  resolutionSource?: string; confidence?: string; appNameFromContent?: string; appNameFromFilename?: string; indicesRecalculated?: boolean;
}
