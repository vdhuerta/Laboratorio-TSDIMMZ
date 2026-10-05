import { activeLanes, escalonOf, isLaneCorrect, ladoOf } from '../data/lab';
import { devKey, type DevSituation } from '../data/devolutions';
import type { ActivityKey, Snapshot } from '../labTypes';
import { laneLengths } from './metrics';

/** Orden de revisión de los carriles (datos declarados, no posición): TSD 1 desde el escalón 1 (rótulo menor, abajo); TSD 3 L1, L2, L3, L4. */
const order = (a: ActivityKey, scope: number[], cfg: Snapshot['config']) =>
  a === 'TSD1' ? scope.slice().sort((x, y) => escalonOf(cfg, x).rotulo - escalonOf(cfg, y).rotulo)
  : a === 'TSD3' ? scope.slice().sort((x, y) => ladoOf(cfg, x).label.localeCompare(ladoOf(cfg, y).label)) : scope;

/** ¿En qué situación está la construcción ahora? Decide qué devolución corresponde (sin juzgar en pantalla). */
export function diagnoseSituation(snap: Snapshot, act: ActivityKey, scope: number[] = activeLanes(act)): DevSituation {
  const lens = (i: number) => laneLengths(snap, act, i);
  const ok = (i: number) => isLaneCorrect(act, i, lens(i), snap.config);
  const E = snap.history.filter((e) => e.activity === act);
  for (let k = E.length - 1; k >= 0; k--) {
    const e = E[k];
    if (e.type === 'place' && (e.payload?.isOverflow === true || e.payload?.isWrong === true) && e.laneIndex !== undefined && scope.includes(e.laneIndex) && lens(e.laneIndex).length > 0 && !ok(e.laneIndex)) return { case: 'error', laneIndex: e.laneIndex, key: devKey(act, 'error', e.laneIndex) };
  }
  const partial = order(act, scope, snap.config).find((i) => lens(i).length > 0 && !ok(i));
  if (partial !== undefined) return { case: 'incompleto', laneIndex: partial, key: devKey(act, 'incompleto', partial) };
  if (order(act, scope, snap.config).every(ok)) return { case: 'completa', key: devKey(act, 'completa', undefined) };
  return { case: 'inicio', key: devKey(act, 'inicio', undefined) };
}
