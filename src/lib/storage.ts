import { ACTIVITIES, DEFAULT_FORM, FORMAS, LANE_COUNT, TARGET_DEFAULT, TARGET_MAX, TARGET_MIN } from '../data/lab';
import type { ActivityKey, AnchorState, FormulationAnswers, FormulationQuestionState, LabEvent, LanesByActivity, RodInstance, TestAreaPiece } from '../labTypes';

const KEY = 'ltsd_session_v2'   // v2: sesión de 18 carriles (10/4/4); las sesiones v1 tenían otra estructura y se descartan;
const K_NAME = 'ltsd_participant_name';
const K_CLS = 'ltsd_class_number';

export interface Session {
  activeActivity: ActivityKey;
  showIntro: boolean;
  /** Forma de la sesión (A/B/C) y meta de las vías del puente (5 a 7) en la forma A. */
  formId: 'A' | 'B' | 'C';
  targetUnits: number;
  /** Pregunta previa «¿Crees que este carril está completo y correcto?» (IM11). */
  judgmentEnabled: boolean;
  inventoryCount: number;
  lanes: LanesByActivity;
  testArea: Record<ActivityKey, TestAreaPiece[]>;
  answers: FormulationAnswers;
  formulationStates: Record<number, FormulationQuestionState>;
  anchorStates: Record<'TSD2' | 'TSD3', AnchorState>;
  history: LabEvent[];
}

export const emptyLanes = (): LanesByActivity => ({ TSD1: Array.from({ length: LANE_COUNT.TSD1 }, () => [] as RodInstance[]), TSD2: Array.from({ length: LANE_COUNT.TSD2 }, () => [] as RodInstance[]), TSD3: Array.from({ length: LANE_COUNT.TSD3 }, () => [] as RodInstance[]) });
export const emptyAnswers = (): FormulationAnswers => ({ q1: '', q2: '', q3: '', q4: '', tsd2Bridge: '', tsd3Bridge: '' });
export const emptyFormulation = (): Record<number, FormulationQuestionState> => ({ 1: { id: 1, answer: '', devolutionLevel: 0, revisionsCount: 0 }, 2: { id: 2, answer: '', devolutionLevel: 0, revisionsCount: 0 }, 3: { id: 3, answer: '', devolutionLevel: 0, revisionsCount: 0 }, 4: { id: 4, answer: '', devolutionLevel: 0, revisionsCount: 0 } });
export const emptyAnchors = (): Record<'TSD2' | 'TSD3', AnchorState> => ({ TSD2: { devolutionLevel: 0, revisionsCount: 0, lastUnlockedAt: null }, TSD3: { devolutionLevel: 0, revisionsCount: 0, lastUnlockedAt: null } });
export const freshSession = (): Session => ({
  activeActivity: 'TSD1', showIntro: true, formId: DEFAULT_FORM, targetUnits: TARGET_DEFAULT, judgmentEnabled: true, inventoryCount: 4, lanes: emptyLanes(), testArea: { TSD1: [], TSD2: [], TSD3: [] },
  answers: emptyAnswers(), formulationStates: emptyFormulation(), anchorStates: emptyAnchors(), history: [],
});

export const storage = {
  session(): Session {
    const d = freshSession();
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return d;
      const s = JSON.parse(raw) as Partial<Session>;
      const lanes = emptyLanes();
      ACTIVITIES.forEach((a) => { for (let i = 0; i < LANE_COUNT[a]; i++) lanes[a][i] = s.lanes?.[a]?.[i] ?? []; });
      return {
        ...d, ...s, lanes, testArea: { ...d.testArea, ...(s.testArea ?? {}) }, answers: { ...d.answers, ...(s.answers ?? {}) },
        formulationStates: { ...d.formulationStates, ...(s.formulationStates ?? {}) }, anchorStates: { ...d.anchorStates, ...(s.anchorStates ?? {}) },
        formId: FORMAS.some((f) => f.id === s.formId) ? s.formId! : DEFAULT_FORM, targetUnits: Math.min(TARGET_MAX, Math.max(TARGET_MIN, Number(s.targetUnits) || TARGET_DEFAULT)), judgmentEnabled: s.judgmentEnabled !== false,
        history: Array.isArray(s.history) ? s.history : [],
      };
    } catch { return d; }
  },
  saveSession(s: Session) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin almacenamiento */ } },
  name: (): string => { try { return localStorage.getItem(K_NAME) ?? ''; } catch { return ''; } },
  saveName: (n: string) => { try { localStorage.setItem(K_NAME, n); } catch { /* */ } },
  /** Clase que declara el informe: número 1–12, o null = no declarar. */
  classNumber: (def: number): number | null => { try { const v = localStorage.getItem(K_CLS); if (v === null) return def; return v === 'none' ? null : Number(v); } catch { return def; } },
  saveClassNumber: (c: number | null) => { try { localStorage.setItem(K_CLS, c === null ? 'none' : String(c)); } catch { /* */ } },
  clearSession: () => { try { localStorage.removeItem(KEY); } catch { /* */ } },
};
