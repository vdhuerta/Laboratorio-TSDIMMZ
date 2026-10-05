/** Tipos propios del Laboratorio (los del Diario de Campo viven en types.ts y no se tocan). */
export type ActivityKey = 'TSD1' | 'TSD2' | 'TSD3';

export type EventType =
  | 'place'              // intento de colocar una regleta en un carril (payload: fits, isOverflow, isWrong, rejected, sumBefore, target)
  | 'remove'             // retiro de una regleta de un carril (payload: wasIncorrect, wasFlagged, wasCorrect, afterFlagged, sumBefore)
  | 'test_area_open'     // abre / cierra el área «Experimenta»
  | 'test_area_use'      // coloca una regleta nueva en el área «Experimenta»
  | 'question_open'      // abre una pregunta de formulación (TSD 1)
  | 'question_answer'    // respuesta escrita registrada (formulación o anclaje)
  | 'answer_revision'    // revisión de una respuesta que ya tenía texto
  | 'devolution_open'    // abre el panel de Devolución didáctica (payload: scope 'construction', case, key, lane). Es lo que canoniza a 'devolucion'
  | 'devolution_request' // solicita una devolución didáctica (formulación o anclaje)
  | 'anchor_open'        // abre el panel de anclajes
  | 'formulation_panel_open'
  | 'validation_success' // un carril queda en su configuración correcta
  | 'activity_complete'  // todos los carriles de la actividad quedan correctos
  | 'activity_switch'    // cambia de TSD
  | 'instructions_open'  // abre las Instrucciones (payload: complete, prompted = el pulso verde la invitaba)
  | 'didactic_view'      // abre la «Mirada Didáctica» (payload: phase 'open')
  | 'didactic_close'     // cierra la «Mirada Didáctica» (payload: seconds)
  | 'message_view'       // abre el «Mensaje encriptado»
  | 'judgment'           // respuesta al «¿Crees que este carril está completo y correcto?» (payload: declared, real)
  | 'config_change';

export interface LabEvent {
  id: string;
  timestamp: number;
  activity: ActivityKey;
  type: EventType;
  laneIndex?: number;
  rodLength?: number;
  questionId?: number;
  devolutionLevel?: number;
  payload?: Record<string, unknown>;
}

export interface RodInstance { id: string; length: number; color: string; code: string }
export interface TestAreaPiece extends RodInstance { x: number; y: number }

export interface FormulationAnswers { q1: string; q2: string; q3: string; q4: string; tsd2Bridge: string; tsd3Bridge: string }
export interface FormulationQuestionState { id: number; answer: string; devolutionLevel: number; revisionsCount: number }
export interface AnchorState { devolutionLevel: number; revisionsCount: number; lastUnlockedAt?: number | null }

export type LanesByActivity = Record<ActivityKey, RodInstance[][]>;
/** `formId` = forma de la sesión (A/B/C); `targetUnits` = meta de las vías del puente en la forma A (5 a 7). */
export interface LabConfig { formId: 'A' | 'B' | 'C'; targetUnits: number; judgmentEnabled: boolean }

/** Todo lo que el motor de indicadores necesita para calcular (y lo que el reporte vuelca como traza). */
export interface Snapshot {
  history: LabEvent[];
  lanes: LanesByActivity;
  answers: FormulationAnswers;
  formulationStates: Record<number, FormulationQuestionState>;
  anchorStates: Record<'TSD2' | 'TSD3', AnchorState>;
  config: LabConfig;
}
