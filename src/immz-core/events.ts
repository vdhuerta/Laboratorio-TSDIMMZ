/**
 * immz-core · vocabulario canónico de eventos IMMZ 4.1.
 * Cada app traduce sus propios eventos de interfaz a esta unión antes de
 * llamar a computeIndicators(). Módulo portable, sin dependencias de la app.
 */

export interface IntentoEvent { type: 'intento'; unidad: string; objetivo: string; acierto: boolean; primerIntento: boolean; ts: number }
export interface PausaEvent { type: 'pausa'; duracionMs: number; eventoSiguiente: string; ts: number }
export interface DevolucionEvent { type: 'devolucion'; unidad: string; origen: string; ts: number }
/**
 * REGLA CANÓNICA (no la emiten las apps): immz-core deriva 'revision' automáticamente a partir
 * de 'intento' + 'devolucion' en computeIndicators() — ver deriveRevisiones() en compute.ts.
 * Se deriva una revisión sobre una unidad cuando esa unidad recibe un nuevo 'intento' después de
 * que se registró una 'devolucion' sobre ella:
 *   latenciaMs = ts del intento − ts de la devolución.
 *   trasDevolucion = true.
 *   trasError = true si el intento inmediatamente anterior sobre esa unidad (antes de la
 *               devolución) había fallado.
 * El tipo queda exportado por si alguna app tiene una señal más rica y quiere emitir revisiones
 * propias (se combinan con las derivadas, nunca las reemplazan) — no es necesario para IM4.
 */
export interface RevisionEvent { type: 'revision'; unidad: string; trasError: boolean; trasDevolucion: boolean; latenciaMs: number; ts: number }
export interface FaseEvent { type: 'fase'; fase: string; orden: number; esSalto: boolean; ts: number }
export interface RedundanteEvent { type: 'redundante'; unidad: string; repeticiones: number; ts: number }
/**
 * Acto de formulación en el sentido de Brousseau: el registro del saber puede expresarse por
 * escrito ('texto') o por una acción verificable ('accion', p. ej. ubicar una tarjeta en la
 * columna de Formulación). Lo que importa para IM10 es que el acto sea verificable como correcto
 * o incorrecto, no el canal. `caracteres`/`palabras` solo aplican cuando modo === 'texto'.
 */
export interface FormulacionEvent { type: 'formulacion'; referencia: string; modo: 'accion' | 'texto'; correcta: boolean; caracteres?: number; palabras?: number; ts: number }
export interface JuicioEvent { type: 'juicio'; unidad: string; declarado: boolean; real: boolean; ts: number }

export type ImmzEvent =
  | IntentoEvent | PausaEvent | DevolucionEvent | RevisionEvent
  | FaseEvent | RedundanteEvent | FormulacionEvent | JuicioEvent;

export const isIntento = (e: ImmzEvent): e is IntentoEvent => e.type === 'intento';
export const isPausa = (e: ImmzEvent): e is PausaEvent => e.type === 'pausa';
export const isDevolucion = (e: ImmzEvent): e is DevolucionEvent => e.type === 'devolucion';
export const isRevision = (e: ImmzEvent): e is RevisionEvent => e.type === 'revision';
export const isFase = (e: ImmzEvent): e is FaseEvent => e.type === 'fase';
export const isRedundante = (e: ImmzEvent): e is RedundanteEvent => e.type === 'redundante';
export const isFormulacion = (e: ImmzEvent): e is FormulacionEvent => e.type === 'formulacion';
export const isJuicio = (e: ImmzEvent): e is JuicioEvent => e.type === 'juicio';

/** Oportunidades de diseño por indicador (denominador esperable), declaradas por la app. Opcional. */
export type OpportunityTarget = Record<string, number>;
