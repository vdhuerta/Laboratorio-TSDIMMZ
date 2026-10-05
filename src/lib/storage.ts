import type { Board, HistoryEvent } from './metrics';
import { DEFAULT_FORMA_ID, TSDPhase, type Card, type Forma } from '../data/cards';

const K = { items: 'tsd_items', analyzed: 'tsd_analyzed_ids', history: 'tsd_action_history', name: 'tsd_participant_name', cls: 'tsd_class_number', judgment: 'tsd_judgment_enabled', forma: 'tsd_forma_id' };
const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

export function shuffle<T>(a: T[]): T[] { const s = [...a]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; }
export const freshBoard = (cards: Card[]): Board => ({ available: shuffle(cards), [TSDPhase.ACTION]: [], [TSDPhase.FORMULATION]: [], [TSDPhase.VALIDATION]: [], [TSDPhase.INSTITUTIONALIZATION]: [] });

export const storage = {
  /** Lee el tablero guardado si corresponde a las MISMAS tarjetas de `cards` (misma forma);
   *  si no (p. ej. la sesión guardada es de otra forma), arranca un tablero nuevo con `cards`. */
  board: (cards: Card[]): Board => {
    const b = read<Board | null>(K.items, null);
    if (!b || !Array.isArray(b.available)) return freshBoard(cards);
    const savedIds = new Set(Object.values(b).flat().map((c) => (c as Card).id));
    const sameForma = cards.length === savedIds.size && cards.every((c) => savedIds.has(c.id));
    if (!sameForma) return freshBoard(cards);
    return { ...b, available: shuffle(b.available) };
  },
  saveBoard: (b: Board) => write(K.items, b),
  analyzed: (): string[] => read<string[]>(K.analyzed, []),
  saveAnalyzed: (a: string[]) => write(K.analyzed, a),
  history: (): HistoryEvent[] => read<HistoryEvent[]>(K.history, []),
  saveHistory: (h: HistoryEvent[]) => write(K.history, h),
  name: (): string => { try { return localStorage.getItem(K.name) ?? ''; } catch { return ''; } },
  saveName: (n: string) => { try { localStorage.setItem(K.name, n); } catch { /* */ } },
  /** Clase que declara el informe: número 1–12, o null = no declarar. */
  classNumber: (def: number): number | null => { try { const v = localStorage.getItem(K.cls); if (v === null) return def; return v === 'none' ? null : Number(v); } catch { return def; } },
  saveClassNumber: (c: number | null) => { try { localStorage.setItem(K.cls, c === null ? 'none' : String(c)); } catch { /* */ } },
  /** Modal de calibración del juicio (IM11). Activado por defecto. */
  judgmentEnabled: (): boolean => { try { const v = localStorage.getItem(K.judgment); return v === null ? true : v === '1'; } catch { return true; } },
  saveJudgmentEnabled: (v: boolean) => { try { localStorage.setItem(K.judgment, v ? '1' : '0'); } catch { /* */ } },
  /** Forma del contenido (A/B/C) elegida para esta sesión. 'A' por defecto si no se eligió. */
  formaId: (): Forma['id'] => { try { const v = localStorage.getItem(K.forma); return v === 'B' || v === 'C' ? v : DEFAULT_FORMA_ID; } catch { return DEFAULT_FORMA_ID; } },
  saveFormaId: (id: Forma['id']) => { try { localStorage.setItem(K.forma, id); } catch { /* */ } },
  clearSession: () => { try { [K.items, K.analyzed, K.history].forEach((k) => localStorage.removeItem(k)); } catch { /* */ } },
};
