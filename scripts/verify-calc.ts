/**
 * Prueba diferencial: cálculo ORIGINAL del Simulador TSD (copia literal, scripts/_orig_calc.ts)
 * vs. cálculo de esta versión (src/lib/metrics.ts) sobre miles de sesiones aleatorias.
 */
import { originalCalc, originalDevolution } from './_orig_calc';
import { INITIAL_CARDS, TSDPhase } from '../src/data/cards';
import { computeIndicators, computeStats, devolutionPct, indicesOf } from '../src/lib/metrics';

const PH = [TSDPhase.ACTION, TSDPhase.FORMULATION, TSDPhase.VALIDATION, TSDPhase.INSTITUTIONALIZATION];
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

function session() {
  const board: any = { available: [...INITIAL_CARDS], action: [], formulation: [], validation: [], institutionalization: [] };
  const history: any[] = []; let t = 1_700_000_000_000; const analyzed = new Set<string>();
  const n = Math.floor(rnd() * 40);
  for (let i = 0; i < n; i++) {
    t += pick([800, 2000, 4999, 5000, 5001, 20000, 60000, 60001, 90000]);
    const where = Object.keys(board).filter((k) => board[k].length);
    if (rnd() < 0.25 && where.some((k) => k !== 'available')) { // devolución
      const k = pick(where.filter((x) => x !== 'available')); const c = pick(board[k]) as any;
      history.push({ type: 'analysis', cardId: c.id, cardContent: c.content, timestamp: t }); analyzed.add(c.id); continue;
    }
    const from = pick(where); const c = pick(board[from]) as any; const to = pick(PH);
    if (to === from) continue;
    board[from] = board[from].filter((x: any) => x.id !== c.id); board[to].push(c);
    history.push({ type: 'move', cardId: c.id, cardContent: c.content, from, to, isCorrect: to === c.correctPhase, timestamp: t });
  }
  return { board, history, analyzed };
}
const codeOf: Record<string, string> = { vigilancia: 'IM1', reflexiva: 'IM2', autocorreccion: 'IM3', feedback: 'IM4', resiliencia: 'IM5', secuencia: 'IM6', carga: 'IM7', ensayo: 'IM8', predictiva: 'IM9', 'formulación': 'IM10' };
let bad = 0, N = 5000; const diffs: Record<string, number> = {}; let maxIdxDelta = 0;
const note = (k: string, d: string) => { diffs[k] = (diffs[k] ?? 0) + 1; if (diffs[k] <= 2) console.log('  ✗', k, d); bad++; };
for (let i = 0; i < N; i++) {
  const { board, history, analyzed } = session();
  const o = originalCalc(history, board);
  const mine = computeIndicators(history, board); const st = computeStats(history, board); const idx = indicesOf(mine);
  // indicadores
  for (const m of o.metrics) { const c = codeOf[m.id]; const v = mine.find((x) => x.code === c)!.value; if (v !== m.value) note(c, `orig=${m.value} nuevo=${v}`); }
  // estadísticas / apropiación
  const os = o.stats;
  for (const [a, b] of [['appropriation', 'appropriation'], ['totalMoves', 'totalMoves'], ['currentHits', 'currentHits'], ['currentErrors', 'currentErrors'], ['analyses', 'analyses'], ['accuracy', 'accuracy'], ['efficiency', 'efficiency'], ['reflectionFactor', 'reflectionFactor'], ['itemsAssigned', 'itemsAssigned']] as const) if ((os as any)[a] !== (st as any)[b]) note('stats.' + a, `orig=${(os as any)[a]} nuevo=${(st as any)[b]}`);
  // índices: el original redondea a entero; el Diario/nuevo a 1 decimal → deben coincidir tras redondear
  for (const [k, ov, nv] of [['immz', o.immz, idx.immz], ['idcd', o.idcd, idx.idcd], ['immg', o.immg, idx.immg], ['immz_ao', o.immz_ao, idx.immzAO], ['immz_ac', o.immz_ac, idx.immzAC]] as const) {
    if ((ov === null) !== (nv === null)) note('idx.' + k, `null distinto`); else if (ov !== null) { const d = Math.abs(ov - nv!); maxIdxDelta = Math.max(maxIdxDelta, d); if (d > 0.5 + 1e-9) note('idx.' + k, `orig=${ov} nuevo=${nv}`); if (Math.round(nv!) !== ov && !Number.isInteger(nv! * 2)) note('idx.round.' + k, `orig=${ov} nuevo=${nv}`); }
  }
  // barra "Devolución" del panel lateral
  const od = originalDevolution(board, analyzed); const nd = devolutionPct(board, analyzed.size); if (od !== nd) note('devolution', `orig=${od} nuevo=${nd}`);
}
console.log(`\n${N} sesiones aleatorias · diferencias: ${bad}${bad ? ' → ' + JSON.stringify(diffs) : ''} · máx. |Δ índice| = ${maxIdxDelta.toFixed(2)} pp (solo por redondeo entero vs 1 decimal)`);
process.exit(bad ? 1 : 0);
