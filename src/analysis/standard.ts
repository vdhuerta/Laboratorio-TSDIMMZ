/**
 * ESTÁNDAR DE ANÁLISIS METACOGNITIVO (común a las 5 apps de la tesis)
 * ──────────────────────────────────────────────────────────────────────
 * Orden fijo del análisis del participante (pantalla y reporte HTML):
 *   0. Encabezado (módulo + título + botón de descarga con nombre requerido) y pestañas
 *      El reporte HTML descargable usa SIEMPRE el mismo título «Análisis Metacognitivo»
 *      (código de certificado y fecha arriba a la derecha) y el subtítulo fijo
 *      «Evaluación del proceso de autorregulación y desempeño didáctico <app>» (cfg.reportSubtitle).
 *   1. Tarjeta «Apropiación Teórica» (exactitud · eficiencia · reflexión)
 *   2. Medidor circular IMMG  +  texto explicativo
 *   3. DIMENSIÓN 1 · Monitoreo Metacognitivo (Zimmerman & Moylan, 2009)   [IMMZ-AO · IMMZ-AC · IMMZ Global]
 *        Veredicto → A1 Autoobservación (IM1, IM2) → A2 Autocontrol (IM3, IM4, IM5)
 *   4. DIMENSIÓN 2 · Competencia propia de cada app                       [sub-índice IDCD/ICMR/…]
 *        Veredicto → IM6…IM10 (sin subdimensiones)
 *   5. Mapeo DigCompEdu · Área 4
 *   6. (solo reporte) bloques propios de la app  →  7. Fundamentación teórica
 * Lo que cambia entre apps vive en AppAnalysisConfig; el orden y las cajas NO cambian.
 */
import type { IndicatorResult } from '../lib/metrics';

export interface IndicatorMeta { name: string; authors: string; description: string; tip: string }
export interface AppAnalysisConfig {
  appName: string;
  moduleLabel: string;               // «Módulo de Evaluación Formativa Digital - <app>»
  title: string;                     // H2
  subtitle: string;
  reportSubtitle: string;            // Subtítulo fijo bajo «Análisis Metacognitivo» en el reporte HTML descargable (mismo patrón en las 5 apps: «Evaluación del proceso de autorregulación y desempeño didáctico <app>»)
  appropriation: { blurb: string; weights: string };
  gaugeIntro: { title: string; p1: string; hint: string };
  dimB: { kicker: string; title: string; subIndexLabel: string };
  indicators: Record<string, IndicatorMeta>;   // IM1…IM10
  digcomp: { implement41: string; implement42: string; implement43: string };
  foundation: string;
}

export type Verdict = { status: string; desc: string };
export interface IndicatorView extends IndicatorMeta {
  code: string; dimension: 'A' | 'B'; subdimension: 'AO' | 'AC' | null; value: number | null; hasEvidence: boolean; formula: string; feedback: string; breakdown?: string; n: number;
}
export interface AnalysisModel {
  cfg: AppAnalysisConfig;
  indicators: IndicatorView[];
  appropriation: { value: number | null; accuracy: number; efficiency: number; reflectionFactor: number; hasEvidence: boolean };
  immz: number | null; immzAO: number | null; immzAC: number | null; idcd: number | null; immg: number | null;
  verdictA: Verdict; verdictB: Verdict; verdictGlobal: string;
  raw: IndicatorResult[];
}
