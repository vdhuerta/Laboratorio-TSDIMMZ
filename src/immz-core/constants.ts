/**
 * immz-core · constantes del motor IMMZ 4.1.
 * Módulo portable: sin imports de ../components ni ../data. Las otras 4 apps
 * copian esta carpeta tal cual — si cambias un umbral aquí, repítelo en las 5.
 */

/** Ventana de pausa "reflexiva" entre dos intentos consecutivos (IM1). */
export const PAUSE_MIN_MS = 5000;
export const PAUSE_MAX_MS = 60000;

/** Ventana para que una 'revision' cuente como aprovechamiento de una 'devolucion' (IM4). */
export const UPTAKE_WINDOW_MS = 300000;

/** Movimientos sobre la misma unidad a partir de los cuales se considera redundancia (IM7). */
export const REDUNDANCY_THRESHOLD = 3;

/** Versión del motor de cálculo. Viaja en el payload del reporte (engine_version). */
export const ENGINE_VERSION = 'immz-core/4.1.0';
