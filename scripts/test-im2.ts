import { im2Detail, computeIndicators } from '../src/lib/metrics';
import type { LabEvent } from '../src/labTypes';
let n = 0; const ev = (t: number, type: any, lane?: number, payload?: any, activity: any = 'TSD1'): LabEvent => ({ id: 'e' + String(n++).padStart(4, '0'), timestamp: t * 1000, activity, type, laneIndex: lane, payload });
const pct = (e: LabEvent[]) => { const d = im2Detail(e); return d.worked ? Math.round((d.credit / d.worked) * 100) : null; };
const chk = (name: string, got: unknown, want: unknown) => { const ok = got === want; console.log(ok ? 'OK  ' : 'FAIL', name, 'got', got, 'want', want); if (!ok) process.exitCode = 1; };
const base = [ev(100, 'place', 0), ev(300, 'place', 1), ev(500, 'place', 2)];
chk('A exp antes de UT1 + devolución UT3', pct([ev(95, 'test_area_use'), ...base, ev(510, 'devolution_request', 2, { scope: 'construction' })]), 67);
chk('B + pregunta abierta', pct([ev(95, 'test_area_use'), ...base, ev(510, 'devolution_request', 2, { scope: 'construction' }), ev(520, 'question_open')]), 83);
chk('C sin actos', pct(base), 0);
chk('D sin manipulación', pct([ev(10, 'test_area_use')]), null);
const e = im2Detail([...base, ev(95, 'test_area_open'), ev(510, 'devolution_request', 2, { scope: 'construction' }), ev(511, 'devolution_request', 2, { scope: 'construction' }), ev(512, 'devolution_request', 2, { scope: 'construction' })]);
chk('E abrir sin usar + 3 devoluciones misma UT', `${e.credit}/${e.worked}`, '1/3');
chk('F exploración 5 min antes', pct([ev(-200, 'test_area_use'), ...base]), 0);
const g: LabEvent[] = []; for (const u of [0, 1, 2]) { g.push(ev(1000 * (u + 1) - 20, 'test_area_use')); for (let k = 0; k < 20; k++) g.push(ev(1000 * (u + 1) + k * 2, 'place', u)); }
chk('G 60 colocaciones, 1 exploración por UT', pct(g), 100);
console.log('IM2 en computeIndicators:', computeIndicators({ history: g, lanes: { TSD1: [], TSD2: [], TSD3: [] }, answers: { q1: '', q2: '', q3: '', q4: '', tsd2Bridge: '', tsd3Bridge: '' }, formulationStates: {}, anchorStates: { TSD2: { devolutionLevel: 0, revisionsCount: 0 }, TSD3: { devolutionLevel: 0, revisionsCount: 0 } }, config: { targetUnits: 6 } } as any).find((r) => r.code === 'IM2')?.value);
