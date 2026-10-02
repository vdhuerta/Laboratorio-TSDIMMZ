import { LANE_COUNT, isLaneCorrect } from '../data/lab';
import { devKey, type DevSituation } from '../data/devolutions';
import type { ActivityKey, Snapshot } from '../labTypes';
import { laneLengths } from './metrics';

const order = (a: ActivityKey) => (a === 'TSD3' ? [3, 0, 1, 2] : a === 'TSD1' ? [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] : Array.from({ length: LANE_COUNT[a] }, (_, i) => i));

/** ¿En qué situación está la construcción ahora? Decide qué devolución corresponde (sin juzgar en pantalla). */
export function diagnoseSituation(snap: Snapshot, act: ActivityKey): DevSituation {
  const lens = (i: number) => laneLengths(snap, act, i);
  const ok = (i: number) => isLaneCorrect(act, i, lens(i), snap.config);
  const E = snap.history.filter((e) => e.activity === act);
  for (let k = E.length - 1; k >= 0; k--) {
    const e = E[k];
    if (e.type === 'place' && (e.payload?.isOverflow === true || e.payload?.isWrong === true) && e.laneIndex !== undefined && lens(e.laneIndex).length > 0 && !ok(e.laneIndex)) return { case: 'error', laneIndex: e.laneIndex, key: devKey(act, 'error', e.laneIndex) };
  }
  const partial = order(act).find((i) => lens(i).length > 0 && !ok(i));
  if (partial !== undefined) return { case: 'incompleto', laneIndex: partial, key: devKey(act, 'incompleto', partial) };
  if (order(act).every(ok)) return { case: 'completa', key: devKey(act, 'completa') };
  return { case: 'inicio', key: devKey(act, 'inicio') };
}
