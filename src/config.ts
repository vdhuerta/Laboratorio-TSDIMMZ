import type { CanonicalIndicatorDef } from './types';

/** Identidad de esta app dentro del Diario de Campo (DEFAULT_APP_CONFIGS.laboratorio_tsd). */
export const APP_META = {
  id: 'laboratorio_tsd',
  name: 'Laboratorio TSD',
  scenarioName: 'Puente del Castillo',
  defaultClassNumber: 9,
  filenamePrefix: 'Reporte_LabTSD_',
} as const;
export const APP_VERSION = '1.0.0';
declare const __BUILD_DATE__: string;
export const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'dev';
export const ADMIN_DEFAULT_PIN = '4132';
/** Texto institucional (pie y reportes). Cámbialo aquí si la cohorte es de otra institución. */
export const INSTITUTION = 'Escuela de Educación Parvularia · UVM';

/** Matriz canónica IM1–IM10: COPIA EXACTA de config.ts del Diario de Campo. No modificar sin actualizar el Diario. */
export const INDICATORS: CanonicalIndicatorDef[] = [
  { id: 'IM1', dimension: 'A', sub: 'AO', label: 'Vigilancia cognitiva sostenida', description: 'Constancia en el seguimiento del problema.', weight: 0.5, aliases: ['vigilancia', 'vigilancia_cognitiva', 'sustained_monitoring'] },
  { id: 'IM2', dimension: 'A', sub: 'AO', label: 'Proporción de detención reflexiva', description: 'Pausas antes de tomar decisiones críticas.', weight: 0.5, aliases: ['detencion', 'detencion_reflexiva', 'pausas', 'reflective_pause'] },
  { id: 'IM3', dimension: 'A', sub: 'AC', label: 'Autocorrección y detección de errores', description: 'Habilidad de notar inconsistencias.', weight: 0.3, aliases: ['autocorreccion', 'deteccion_errores', 'self_correction'] },
  { id: 'IM4', dimension: 'A', sub: 'AC', label: 'Aprovechamiento de la retroalimentación', description: 'Ajuste tras pistas o respuestas.', weight: 0.3, aliases: ['retroalimentacion', 'feedback', 'feedback_use'] },
  { id: 'IM5', dimension: 'A', sub: 'AC', label: 'Resiliencia al fracaso y reajuste', description: 'Capacidad de replanificar tras fallos.', weight: 0.4, aliases: ['resiliencia', 'reajuste', 'resilience'] },
  { id: 'IM6', dimension: 'B', sub: 'IDCD', label: 'Alineación con la secuencia adidáctica', description: 'Fases de acción, formulación, validación e institucionalización.', weight: 0.25, aliases: ['alineacion', 'secuencia', 'adidactica', 'sequence_alignment'] },
  { id: 'IM7', dimension: 'B', sub: 'IDCD', label: 'Fluidez y control de carga cognitiva', description: 'Ritmo y distribución del esfuerzo.', weight: 0.15, aliases: ['fluidez', 'carga_cognitiva', 'cognitive_load'] },
  { id: 'IM8', dimension: 'B', sub: 'IDCD', label: 'Intencionalidad del ensayo y error', description: 'Exploración fundamentada vs. azar.', weight: 0.2, aliases: ['ensayo_error', 'intencionalidad', 'trial_error'] },
  { id: 'IM9', dimension: 'B', sub: 'IDCD', label: 'Precisión predictiva planificada', description: 'Acierto de hipótesis previas a la acción.', weight: 0.2, aliases: ['prediccion', 'precision_predictiva', 'prediction'] },
  { id: 'IM10', dimension: 'B', sub: 'IDCD', label: 'Apropiación de códigos de formulación', description: 'Uso de lenguaje técnico-matemático.', weight: 0.2, aliases: ['codigos', 'formulacion', 'lenguaje', 'formulation_codes'] },
];
