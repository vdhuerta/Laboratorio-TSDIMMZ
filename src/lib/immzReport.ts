import { APP_META, APP_VERSION, INDICATORS, INSTITUTION } from '../config';
import { ACTIVITIES, ACTIVITY_META, ANCHOR_CONFIGS, FORMULATION_QUESTIONS, LANE_COUNT, TOTAL_LANES, TSD3_SIDES, isLaneCorrect, realTarget, rodOf, sideOf, stairNumber } from '../data/lab';
import type { ActivityKey, LabEvent, RodInstance, Snapshot } from '../labTypes';
import type { ImmzCategory } from '../types';
import { categorize } from './immz/scoring';
import { parseReportText } from './immz/parser';
import { ICON_SVG } from './reportIcons';
import { buildAnalysisModel } from '../analysis/model';
import type { IndicatorView } from '../analysis/standard';
import { snapshotImage } from './snapshots';
import { SCORING_VERSION, im2Detail, computeIndicators, computeStats, correctLanes, indicesOf, laneLengths, phaseJumps, promptKeys, stageProgress, type IndicatorResult, type SessionStats } from './metrics';

/**
 * CONTRATO DE REPORTE IMMZ (esquema 4.0) — Diario de Campo ⇄ Laboratorio TSD
 * ───────────────────────────────────────────────────────────────────────────
 * 1. El PRIMER <script type="application/json"> del archivo es el payload canónico (id "bct-report-payload").
 *    El parser del Diario toma el primero que encuentra, por eso las trazas van DESPUÉS (id "tsd-report-raw-data").
 * 2. Códigos IM1–IM10 del esquema 4.0 (nunca nombres): el parser los empareja por código.
 * 3. Claves duplicadas en camelCase y snake_case, porque el parser del Diario normaliza solo algunas
 *    (classNumber, participant.name, apropiacion, aciertos, errores, reflexiones, schemaVersion, scenarioName).
 * 4. Valores 0–100; null = sin evidencia. Los índices se calculan con el mismo scoring del Diario.
 * 5. Nombre de archivo: <prefijo><Nombre>_<ID>.html con prefijo = DEFAULT_APP_CONFIGS.filenamePrefix.
 */

export const CATEGORY_CLASS: Record<ImmzCategory, string> = { Inicial: 'c-ini', 'En Desarrollo': 'c-dev', Competente: 'c-com', Avanzado: 'c-adv' };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const f1 = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`);

export interface ReportInput { participantName: string; classNumber: number | null; snap: Snapshot; now?: Date; certificateId?: string }
export interface BuiltReport {
  html: string; bodyHtml: string; css: string; fileName: string; certificateId: string;
  payload: Record<string, unknown>; indicators: IndicatorResult[]; stats: SessionStats; indices: ReturnType<typeof indicesOf>;
}

export const makeCertificateId = (now: Date) => `${now.getFullYear()}${now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', '')}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
export const safeFileName = (name: string) => name.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Participante';
export const reportFileName = (name: string, id: string) => `${APP_META.filenamePrefix}${safeFileName(name)}_${id}.html`;

export const laneLabel = (a: ActivityKey, idx: number) => (a === 'TSD1' ? `Escalón ${stairNumber(idx)}` : a === 'TSD2' ? `Vía ${idx + 1}` : sideOf(idx).name);
/** Orden de lectura de los carriles de cada actividad (la cerca se lee L1→L4). */
export const laneOrder = (a: ActivityKey) => (a === 'TSD3' ? TSD3_SIDES.map((s) => s.idx) : a === 'TSD1' ? Array.from({ length: LANE_COUNT.TSD1 }, (_, i) => LANE_COUNT.TSD1 - 1 - i) : Array.from({ length: LANE_COUNT[a] }, (_, i) => i));
/** «Mensaje encriptado»: traducción de la construcción al código aditivo (colores → códigos). */
export const encryptedMessage = (snap: Snapshot, a: ActivityKey) => laneOrder(a).map((i) => { const l = snap.lanes[a][i] ?? []; return `${a === 'TSD3' ? sideOf(i).label : (a === 'TSD1' ? 'ESC ' + stairNumber(i) : 'VÍA ' + (i + 1))}: ${l.length ? l.map((r) => r.code).join('-') : '[ ]'}`; });

export const REPORT_CSS = `
:root{--bg:#F2F1EC;--line:#E4E2D8;--ink:#23271F;--mut:#6E6F66;--brand:#24473A;--brand50:#EEF4F1;--brand100:#DCE8E2;--accent:#C98F2D;--accentsoft:#F6ECD6;--white:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;font-weight:400;-webkit-font-smoothing:antialiased;line-height:1.45}
h1,h2,h3,h4,h5{font-weight:700;margin:0}
.wrap{max-width:900px;margin:0 auto;padding:24px 16px 40px}
.sheet{background:var(--white);border:1px solid var(--line);border-radius:12px;box-shadow:0 1px 2px rgba(35,39,31,.06);padding:28px;position:relative;overflow:hidden}
.sheet:before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--brand)}
.micro{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut)}
.head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:20px}
.head h1{font-size:24px;margin-top:4px}.head p{margin:2px 0 0;color:var(--mut);font-size:13px}
.pill{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:2px 10px;font-size:11px;background:#fff;color:var(--ink)}
.cid{font-family:ui-monospace,Menlo,monospace;background:var(--brand50);border-color:var(--brand100);color:var(--brand)}
.c-ini{background:#fff1f2;color:#be123c;border-color:#fecdd3}.c-dev{background:#fffbeb;color:#b45309;border-color:#fde68a}.c-com{background:#f0f9ff;color:#0369a1;border-color:#bae6fd}.c-adv{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.c-none{background:#f7f6f1;color:var(--mut)}
.tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:22px}
.tile{border:1px solid var(--line);border-radius:12px;padding:12px;background:#F7F6F1;min-width:0}
.tile .v{font-size:24px;font-weight:700;margin-top:4px}
.tile .s{font-size:10px;color:var(--mut);margin-top:2px}
.contract{border:1px dashed var(--accent);background:var(--accentsoft);border-radius:12px;padding:12px 14px;font-size:12px;margin-bottom:22px}
.contract b{font-weight:400;color:var(--ink);font-family:ui-monospace,Menlo,monospace;font-size:11px}
.sec{margin-bottom:26px}
.sec>h2{font-size:15px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:12px}
.sec>h2 i{display:inline-block;width:6px;height:18px;border-radius:3px}
.sub{border-left:4px solid #a5b4fc;padding-left:12px;margin-bottom:16px}
.subhead{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#eef2ff;border:1px solid #e0e7ff;border-radius:10px;padding:10px 12px;margin-bottom:10px}
.subhead h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em}.subhead p{margin:2px 0 0;font-size:11px;color:#4338ca}
.verdict{border-radius:10px;padding:12px;font-size:12px;margin-bottom:12px;border:1px solid var(--line);background:#F7F6F1}
.verdict .t{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);display:block;margin-bottom:2px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.card{border:1px solid var(--line);border-radius:16px;padding:18px;background:#fff;break-inside:avoid}
.card .top{display:flex;justify-content:space-between;gap:10px}
.card h4{font-size:13px;line-height:1.3}.card .basis{font-size:10px;color:var(--mut);margin-top:2px;display:block}
.card .val{font-size:18px;font-weight:700;text-align:right}
.bar{height:6px;border-radius:999px;background:#EBEAE2;overflow:hidden;margin:10px 0}.bar i{display:block;height:100%;border-radius:999px}
.card p{font-size:12px;color:var(--mut);margin:6px 0 0}
.diag{margin-top:10px;padding:8px 10px;border-radius:8px;background:#F7F6F1;font-size:12px}
.diag .micro{display:block;margin-bottom:2px}
.ev{font-size:10px;color:var(--mut);margin-top:6px;font-family:ui-monospace,Menlo,monospace}
table{width:100%;border-collapse:collapse;font-size:11px}th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);font-weight:400}td{padding:8px;border-bottom:1px solid #EBEAE2;vertical-align:top}
.note{background:#F7F6F1;border:1px solid var(--line);border-radius:12px;padding:14px;font-size:11px;color:var(--mut)}
.note h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--brand);margin-bottom:6px}
.foot{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);margin-top:24px;padding-top:12px;font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}
.tile.plain{background:#F7F6F1}.tile.w{background:#fff;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;border-color:var(--brand100)}.tile.w.e{border-color:#e0f2fe}.tile.w .v{font-size:22px}
.mini{display:grid;grid-template-columns:1fr 1fr;gap:4px;width:100%;margin-top:6px}.m1{background:#eef2ffcc;border:1px solid #e0e7ff;border-radius:6px;padding:3px}.m1 i{display:block;font-style:normal;font-size:7px;text-transform:uppercase;color:#4f46e5}.m1 b{font-size:12px;font-weight:700;color:#312e81}.m1.g{background:#F7F6F1;border-color:var(--line)}.m1.e{background:#f0f9ffcc;border-color:#e0f2fe}.m1.e i{color:#0284c7}.m1.e b{color:#075985}
.verdict.a{background:#eef2ff66;border-color:#e0e7ff}.verdict.b{background:#f0f9ff99;border-color:#e0f2fe}.verdict em{display:block}
.subval{white-space:nowrap;flex-shrink:0;background:#fff;border:1px solid #c7d2fe;border-radius:8px;padding:4px 10px;text-align:right}.subval b{display:block;font-size:11px;font-weight:700;color:#3730a3}
.chip{display:inline-block;margin-top:8px;background:var(--brand50);border:1px solid var(--brand100);border-radius:999px;padding:3px 10px;font-size:11px;color:var(--brand)}
.bt{font-weight:700}.mono{white-space:nowrap;font-family:ui-monospace,Menlo,monospace;color:var(--brand)}
.ttl{display:flex;align-items:center;gap:14px;flex:1 1 320px;min-width:0}.head .hr{flex:0 0 auto;text-align:right;white-space:nowrap}.ico{position:relative;display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:12px;background:var(--brand);color:#fff;flex-shrink:0}.ico:after{content:"";position:absolute;right:0;top:0;width:11px;height:11px;border-bottom-left-radius:7px;background:var(--accent)}
.kpis3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.kpi3{border:1px solid #e0e7ff;background:#eef2ff;border-radius:12px;padding:8px 10px;text-align:center}.kpi3 i{display:block;font-style:normal;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#4f46e5}.kpi3 b{font-size:20px;font-weight:700;color:#3730a3}.kpi3.g{background:#e0e7ff;border-color:#c7d2fe}.kpi3.g b{color:#1e1b4b}.kpi3.e{background:#f0f9ff;border-color:#e0f2fe}.kpi3.e i{color:#0284c7}.kpi3.e b{color:#075985}
.kpis5{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}.kpi5{display:flex;align-items:center;justify-content:space-between;gap:6px;border:1px solid var(--line);border-radius:12px;padding:10px;background:#fff;break-inside:avoid}.kpi5 .kv{font-size:20px;font-weight:700;margin-top:3px}.kpi5 .kh{font-size:10px;color:var(--mut);line-height:1.3;margin-top:2px}.kic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;flex-shrink:0}
.k-brand .kv{color:var(--brand)}.k-brand .kic{background:var(--brand50);color:var(--brand)}.k-ok .kv{color:#059669}.k-ok .kic{background:#ecfdf5;color:#059669}.k-no .kv{color:#e11d48}.k-no .kic{background:#fff1f2;color:#e11d48}.k-sky .kv{color:#0284c7}.k-sky .kic{background:#f0f9ff;color:#0284c7}.k-amber .kv{color:#b45309}.k-amber .kic{background:var(--accentsoft);color:#b45309}
.act{border:1px solid var(--line);border-radius:12px;padding:12px;background:#F7F6F1;margin-bottom:12px;break-inside:avoid}
.act h3{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--brand);border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:8px;display:flex;justify-content:space-between;gap:8px}
.shots{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:6px}
.shot{border:1px solid var(--line);border-radius:12px;background:#F7F6F1;padding:8px;break-inside:avoid;margin:0}
.shot .img{height:150px;border:1px solid var(--line);border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden}
.shot img{max-width:100%;max-height:100%;display:block}
.shot figcaption{margin-top:6px;font-size:9px;color:var(--brand);text-transform:uppercase;letter-spacing:.05em;display:flex;flex-direction:column;gap:1px}
.shot figcaption span{color:#64748b;text-transform:none;letter-spacing:0}
.lanes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ln{border:1px solid;border-radius:8px;padding:8px;background:#fff;font-size:11px;break-inside:avoid}.ln.ok{border-color:#a7f3d0;background:#ecfdf5cc}.ln.no{border-color:var(--line)}
.ln .k{display:flex;justify-content:space-between;gap:6px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);margin-bottom:5px}
.rods{display:flex;gap:2px;align-items:center;min-height:22px;background:#EBEAE2;border:1px solid var(--line);border-radius:6px;padding:2px;overflow:hidden}
.rod{height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex:0 0 auto}
.rods.empty{color:var(--mut);font-size:10px;font-style:italic;justify-content:center}
.ln .s{font-size:10px;color:var(--mut);margin-top:4px;font-family:ui-monospace,Menlo,monospace}
.code{background:#23271F;color:#F7F6F1;border-radius:8px;padding:8px 10px;font-family:ui-monospace,Menlo,monospace;font-size:10px;white-space:pre-wrap;margin-top:8px}
.ans{border:1px solid var(--line);border-radius:10px;background:#F7F6F1;padding:10px 12px;margin-bottom:8px;break-inside:avoid}
.ans .q{display:flex;justify-content:space-between;gap:8px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--brand);margin-bottom:5px}
.ans p{margin:0;font-size:12px;white-space:pre-wrap}.ans .st{font-size:11px;color:var(--mut);font-style:italic;margin:0 0 6px}
.ans .none{color:var(--mut);font-style:italic}
@media(max-width:720px){.shots{grid-template-columns:1fr}.kpis5{grid-template-columns:1fr 1fr}.kpis3{grid-template-columns:1fr}.tiles{grid-template-columns:1fr 1fr}.grid2,.lanes{grid-template-columns:1fr}}
@media print{body{background:#fff}.wrap{padding:0}.sheet{border:none;box-shadow:none}}
`;

const badge = (c: ImmzCategory | null) => `<span class="pill ${c ? CATEGORY_CLASS[c] : 'c-none'}">${c ?? 'Sin evidencia'}</span>`;

const rodsHtml = (lane: RodInstance[], target: number) => {
  if (!lane.length) return '<div class="rods empty">Sin regletas</div>';
  const total = Math.max(target, lane.reduce((s, r) => s + r.length, 0));
  return `<div class="rods">${lane.map((r) => { const d = rodOf(r.length); return `<span class="rod" style="width:${Math.max(8, (r.length / total) * 100)}%;background:${d?.color ?? '#94a3b8'};color:${d?.text ?? '#fff'};border:1px solid ${d?.border ?? '#64748b'}" title="${esc(d?.name ?? 'Regleta')} (${r.length})">${r.length}</span>`; }).join('')}</div>`;
};

const eventLabel = (e: LabEvent): [string, string] => {
  const lane = e.laneIndex !== undefined ? laneLabel(e.activity, e.laneIndex) : '';
  const rod = e.rodLength ? `Regleta ${e.rodLength} (${rodOf(e.rodLength)?.name ?? ''})` : '';
  switch (e.type) {
    case 'place': return [e.payload?.rejected ? 'Colocación rechazada (no cabe)' : e.payload?.isOverflow || e.payload?.isWrong ? 'Colocación fuera de meta' : 'Colocación', `${rod} → ${lane}`];
    case 'remove': return ['Retiro de regleta', `${rod} ← ${lane}`];
    case 'test_area_open': return [e.payload?.open ? 'Abre Experimenta' : 'Cierra Experimenta', ACTIVITY_META[e.activity].short];
    case 'test_area_use': return ['Experimenta', rod];
    case 'question_open': return ['Pregunta de formulación abierta', `Pregunta ${e.questionId}`];
    case 'question_answer': return ['Respuesta registrada', e.questionId ? `Pregunta ${e.questionId}` : `Anclaje ${e.activity}`];
    case 'answer_revision': return ['Respuesta revisada', e.questionId ? `Pregunta ${e.questionId}` : `Anclaje ${e.activity}`];
    case 'devolution_request': return [e.payload?.scope === 'construction' ? 'Devolución didáctica de la construcción' : 'Devolución solicitada', `${e.payload?.scope === 'construction' ? `${ACTIVITY_META[e.activity].short}${lane ? ` · ${lane}` : ''}` : e.questionId ? `Pregunta ${e.questionId}` : `Anclaje ${e.activity}`} · nivel ${e.devolutionLevel ?? ''}`];
    case 'anchor_open': return ['Panel de anclajes abierto', e.activity];
    case 'formulation_panel_open': return ['Panel de formulación abierto', e.activity];
    case 'validation_success': return ['Carril validado', lane];
    case 'activity_complete': return ['Actividad completada', ACTIVITY_META[e.activity].name];
    case 'activity_switch': return ['Cambio de actividad', `→ ${ACTIVITY_META[e.activity].short}`];
    case 'instructions_open': return [e.payload?.prompted ? 'Abre Instrucciones (invitada por el pulso verde)' : 'Abre Instrucciones', ACTIVITY_META[e.activity].short];
    case 'didactic_view': return ['Abre la Mirada Didáctica', ACTIVITY_META[e.activity].short];
    case 'didactic_close': return ['Cierra la Mirada Didáctica', `${ACTIVITY_META[e.activity].short} · ${e.payload?.seconds ?? 0} s`];
    case 'message_view': return ['Mensaje encriptado', ACTIVITY_META[e.activity].short];
    default: return ['Cambio de configuración', JSON.stringify(e.payload ?? {})];
  }
};

export function buildReport(input: ReportInput): BuiltReport {
  const now = input.now ?? new Date();
  const certificateId = input.certificateId ?? makeCertificateId(now);
  const name = input.participantName.trim();
  const { snap } = input;
  const history = snap.history.slice().sort((a, b) => a.timestamp - b.timestamp);
  const indicators = computeIndicators(snap);
  const idx = indicesOf(indicators);
  const stats = computeStats(snap);
  const duration = history.length ? Math.max(0, Math.round((now.getTime() - history[0].timestamp) / 1000)) : 0;
  const cls = input.classNumber;

  const payloadIndicators = INDICATORS.map((d) => {
    const r = indicators.find((x) => x.code === d.id)!;
    return { code: d.id, name: d.label, dimension: d.dimension, subdimension: d.sub, value: r.value, level: categorize(r.value), has_evidence: r.value !== null, evidence_n: r.denominator, feedback: r.feedback };
  });
  const progression = ACTIVITIES.map((a) => { const ind = computeIndicators(snap, a); const ix = indicesOf(ind); return { actividad: a, immz: ix.immz, idcd: ix.idcd, immg: ix.immg, indicadores_con_evidencia: ind.filter((i) => i.value !== null).length, devoluciones_construccion: snap.history.filter((e) => e.activity === a && e.type === 'devolution_request' && e.payload?.scope === 'construction').length, carriles_correctos: correctLanes(snap, a), carriles_totales: LANE_COUNT[a], avance_pct: stageProgress(snap, a) }; });
  const formulacion = [1, 2, 3, 4].map((q) => ({ pregunta: q, titulo: FORMULATION_QUESTIONS[q - 1].subhead, respuesta: snap.answers[`q${q}` as 'q1'] || '', devoluciones_consultadas: snap.formulationStates[q]?.devolutionLevel ?? 0, revisiones: snap.formulationStates[q]?.revisionsCount ?? 0 }));
  const anclajes = (['TSD2', 'TSD3'] as const).map((a) => ({ actividad: a, titulo: ANCHOR_CONFIGS[a].title, subhead: ANCHOR_CONFIGS[a].subhead, enunciado: ANCHOR_CONFIGS[a].enunciado, respuesta: snap.answers[a === 'TSD2' ? 'tsd2Bridge' : 'tsd3Bridge'] || '', devoluciones_consultadas: snap.anchorStates[a].devolutionLevel, revisiones: snap.anchorStates[a].revisionsCount }));

  // ── Payload canónico (lo lee el Diario) ──
  const payload: Record<string, unknown> = {
    schema_version: '4.0', schemaVersion: '4.0', scoring_version: SCORING_VERSION,
    app: { id: APP_META.id, name: APP_META.name, version: APP_VERSION },
    scenarioName: APP_META.scenarioName,
    class_number: cls, classNumber: cls,
    participant: { name }, participant_name: name, participantName: name,
    certificate_id: certificateId,
    generatedAt: now.toISOString(), duration_seconds: duration,
    indicators: payloadIndicators,
    immz: idx.immz, immz_ao: idx.immzAO, immz_ac: idx.immzAC, idcd: idx.idcd, immg: idx.immg, category: idx.category,
    apropiacion: stats.appropriation, aciertos: stats.currentHits, errores: stats.currentErrors, reflexiones: stats.reflections, movimientos: stats.totalMoves,
    appropriation: { value: stats.appropriation, has_evidence: stats.hasEvidence, components: { accuracy: stats.accuracy, efficiency: stats.efficiency, reflection: stats.reflectionFactor }, weights: { accuracy: 0.5, efficiency: 0.25, reflection: 0.25 } },
    activity: { total_moves: stats.totalMoves, placements: stats.placements, hits: stats.currentHits, errors: stats.currentErrors, reflections: stats.reflections, devolutions: stats.devolutions, answers: stats.answered, items_assigned: stats.lanesTouched, items_total: stats.totalLanes },
    progression, formulation: formulacion, anchors: anclajes,
    config: { target_units_tsd2: snap.config.targetUnits },
  };

  // ── Trazas crudas (no las lee el parser: van en un segundo bloque) ──
  let prev: number | null = null;
  const trace = history.map((h, i) => { const dt = prev === null ? null : h.timestamp - prev; prev = h.timestamp; return { seq: i + 1, t: new Date(h.timestamp).toISOString(), ms: h.timestamp, dt_ms: dt, activity: h.activity, type: h.type, lane: h.laneIndex ?? null, rod_length: h.rodLength ?? null, question_id: h.questionId ?? null, devolution_level: h.devolutionLevel ?? null, payload: h.payload ?? null }; });
  const raw = {
    schema: 'immz-trace/1', app: payload.app, certificate_id: certificateId, class_number: cls, participant_name: name,
    started_at: history.length ? new Date(history[0].timestamp).toISOString() : null, ended_at: now.toISOString(), duration_seconds: duration,
    indicator_evidence: indicators.map((r) => ({ code: r.code, value: r.value, numerator: r.numerator, denominator: r.denominator, formula: r.formula })),
    scoring: { version: SCORING_VERSION, im2: { unit: 'carril', units_worked: im2Detail(history).worked, credit: Math.round(im2Detail(history).credit * 10) / 10, detail: im2Detail(history).units } },
    didactic_prompts: ACTIVITIES.map((a) => {
      const E = history.filter((e) => e.activity === a); const done = E.find((e) => e.type === 'activity_complete');
      const ins = done ? E.find((e) => e.type === 'instructions_open' && e.timestamp >= done.timestamp) : undefined;
      const dv = E.find((e) => e.type === 'didactic_view'); const dc = E.filter((e) => e.type === 'didactic_close').pop();
      const iso = (e?: LabEvent) => (e ? new Date(e.timestamp).toISOString() : null);
      return { activity: a, completed_at: iso(done), instructions_opened_at: iso(ins), instructions_prompted: ins?.payload?.prompted === true, didactic_opened_at: iso(dv), didactic_seconds: typeof dc?.payload?.seconds === 'number' ? dc.payload.seconds : null, seconds_to_didactic: done && dv ? Math.max(0, Math.round((dv.timestamp - done.timestamp) / 1000)) : null };
    }),
    phase_jumps: phaseJumps(snap),
    final_state: Object.fromEntries(ACTIVITIES.map((a) => [a, laneOrder(a).map((i) => ({ lane: i, label: laneLabel(a, i), target: realTarget(a, i, snap.config), rods: laneLengths(snap, a, i), is_correct: isLaneCorrect(a, i, laneLengths(snap, a, i), snap.config) }))])),
    answers: snap.answers, formulation_states: snap.formulationStates, anchor_states: snap.anchorStates, config: snap.config,
    trace,
  };
  const json = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

  // ── Cuerpo visual: ESTÁNDAR (mismo orden que la pantalla y que Rutinas Matematizadas) ──
  const m = buildAnalysisModel(snap);
  const cfg = m.cfg;
  const card = (i: IndicatorView, tone: string) => {
    const cat = categorize(i.value);
    return `<div class="card" data-variable="${i.code}" data-value="${i.value ?? ''}"><div class="top"><div><h4>${esc(i.name)}</h4><span class="basis">${esc(i.authors)}</span></div><div><div class="val">${f1(i.value)}</div>${badge(cat)}</div></div>
      <p>${esc(i.description)}</p>${i.breakdown ? `<div class="chip">${esc(i.breakdown)}</div>` : ''}
      <div class="bar"><i style="width:${i.value ?? 0}%;background:${tone}"></i></div>
      <div class="diag"><span class="micro">Diagnóstico cualitativo:</span>${esc(i.feedback)}</div>
      <div class="ev">n=${i.n} · ${esc(i.formula)}</div></div>`;
  };
  const subhead = (code: string, title: string, blurb: string, label: string, v: number | null, dv: string) => `<div class="subhead"><div><h3>Subdimensión ${code} — ${title}</h3><p>${blurb}</p></div><div class="subval"><b data-variable="${dv}" data-value="${v ?? ''}">${label}: ${f1(v)}</b><span class="micro">${esc(categorize(v) ?? 'Sin evidencia')}</span></div></div>`;
  const ind = (sub: string) => m.indicators.filter((i) => (sub === 'B' ? i.dimension === 'B' : i.subdimension === sub));
  const ap = m.appropriation;

  const kpi5 = ([['Apropiación Teórica', ap.hasEvidence ? f1(ap.value) : 'Sin evidencia', `Exactitud ${ap.accuracy}% · Efic. ${ap.efficiency}%`, ICON_SVG.grad, 'k-brand'], ['Aciertos (hoy)', String(stats.currentHits), `Carriles correctos de ${TOTAL_LANES}`, ICON_SVG.check, 'k-ok'], ['Errores', String(stats.currentErrors), 'Piezas fuera de meta o lado mal compuesto', ICON_SVG.x, 'k-no'], ['Movimientos', String(stats.totalMoves), 'Colocaciones y retiros de regletas', ICON_SVG.click, 'k-sky'], ['Devoluciones', String(stats.devolutions), 'Devoluciones didácticas consultadas', ICON_SVG.search, 'k-amber']] as [string, string, string, (s?: number) => string, string][])
    .map(([l, v, h, ic, c]) => `<div class="kpi5 ${c}"><div><span class="micro">${l}</span><div class="kv">${v}</div><div class="kh">${h}</div></div><span class="kic">${ic(20)}</span></div>`).join('');

  const progTable = `<table><thead><tr><th>Actividad</th><th>Carriles correctos</th><th>IMMZ (Monitoreo)</th><th>IDCD (Didáctica)</th><th>Indicadores con evidencia</th></tr></thead><tbody>${progression.map((p) => `<tr><td><b class="bt">${p.actividad}</b> · ${esc(ACTIVITY_META[p.actividad].name)}</td><td>${p.carriles_correctos} / ${p.carriles_totales}</td><td>${f1(p.immz)}</td><td>${f1(p.idcd)}</td><td>${p.indicadores_con_evidencia} / 10</td></tr>`).join('')}</tbody></table>`;

  const actBlock = (a: ActivityKey) => {
    const done = correctLanes(snap, a);
    const lanes = laneOrder(a).map((i) => {
      const lengths = laneLengths(snap, a, i); const t = realTarget(a, i, snap.config); const ok = isLaneCorrect(a, i, lengths, snap.config);
      const clue = a === 'TSD3' ? ` · ${esc(sideOf(i).clue)}` : '';
      return `<div class="ln ${ok ? 'ok' : 'no'}"><div class="k"><span>${esc(laneLabel(a, i))}${clue}</span><span class="pill ${ok ? 'c-adv' : lengths.length ? 'c-ini' : 'c-none'}" style="font-size:8px;padding:0 6px">${ok ? 'Correcto' : lengths.length ? 'Incompleto' : 'Sin iniciar'}</span></div>${rodsHtml(snap.lanes[a][i] ?? [], t)}<div class="s">${lengths.length ? `${lengths.join(' + ')} = ${lengths.reduce((s, l) => s + l, 0)}` : '—'}${a !== 'TSD1' ? ` / ${t}` : ''}</div></div>`;
    }).join('');
    const msg = encryptedMessage(snap, a);
    return `<div class="act" data-activity="${a}"><h3><span>${a} · ${esc(ACTIVITY_META[a].name)} — ${esc(ACTIVITY_META[a].scene)}</span><span>${done} / ${LANE_COUNT[a]} carriles correctos</span></h3><div class="lanes">${lanes}</div><div class="code"><span class="micro" style="color:#C98F2D">Mensaje encriptado (código aditivo)</span>\n${esc(msg.join(a === 'TSD3' ? '  |  ' : '\n'))}</div></div>`;
  };
  const shots = `<div class="shots" data-testid="report-shots">${ACTIVITIES.map((a) => `<figure class="shot" data-activity="${a}"><div class="img"><img src="${snapshotImage(snap, a)}" alt="Construcción final ${a}"/></div><figcaption><b>${a}</b> · ${esc(ACTIVITY_META[a].name)}<span>${correctLanes(snap, a)} / ${LANE_COUNT[a]} carriles correctos</span></figcaption></figure>`).join('')}</div>`;
  const answerBlock = (title: string, sub: string, enun: string, text: string, devs: number, revs: number) => `<div class="ans"><div class="q"><span>${esc(title)}</span><span>Devoluciones consultadas: ${devs}/3 · Revisiones: ${revs}</span></div><p class="st">${esc(sub)} — ${esc(enun)}</p>${text.trim() ? `<p>${esc(text)}</p>` : '<p class="none">(Sin respuesta registrada)</p>'}</div>`;

  const bodyHtml = `<div class="wrap"><div class="sheet">
    <div class="head"><div class="ttl"><span class="ico">${ICON_SVG.activity(22)}</span><div><span class="micro" style="color:var(--brand)">${esc(cfg.moduleLabel)}</span><h1>Análisis Metacognitivo</h1><p>${esc(cfg.reportSubtitle)}</p></div></div>
      <div class="hr"><span class="pill cid">${esc(certificateId)}</span><p>Generado el ${esc(now.toLocaleDateString('es-CL'))} ${esc(now.toLocaleTimeString('es-CL'))}</p></div></div>

    <div class="tiles" id="tsd-summary-container" data-activity-total-moves="${stats.totalMoves}" data-activity-hits="${stats.currentHits}" data-activity-errors="${stats.currentErrors}" data-activity-analyses="${stats.reflections}">
      <div class="tile plain"><span class="micro">Participante / Diseñador</span><div class="v" style="font-size:15px;color:var(--brand)" id="tsd-participant-name" data-value="${esc(name)}">${esc(name) || 'No especificado'}</div><div class="s">${esc(INSTITUTION)}</div></div>
      <div class="tile w" data-variable="appropriation" data-value="${ap.value ?? ''}"><span class="micro" style="color:var(--brand)">Apropiación teórica</span><div class="v" style="color:var(--brand)">${ap.hasEvidence ? f1(ap.value) : 'Sin evidencia'}</div><div class="s">Exactitud ${ap.accuracy} % · Eficiencia ${ap.efficiency} % · Reflexión ${ap.reflectionFactor} %</div></div>
      <div class="tile w" data-variable="immg" data-value="${m.immg ?? ''}"><span class="micro" style="color:var(--brand)">Índice global (IMMG)</span><div class="v" style="color:var(--brand)">${f1(m.immg)}</div>${badge(idx.category)}</div>
      <div class="tile w"><span class="micro">Sub-índices metacognitivos</span><div class="mini"><div class="m1"><i>AO</i><b data-variable="IMMZ-AO" data-value="${m.immzAO ?? ''}">${f1(m.immzAO)}</b></div><div class="m1"><i>AC</i><b data-variable="IMMZ-AC" data-value="${m.immzAC ?? ''}">${f1(m.immzAC)}</b></div><div class="m1 g"><i>IMMZ</i><b data-variable="IMMZ" data-value="${m.immz ?? ''}">${f1(m.immz)}</b></div><div class="m1 e"><i>IDCD</i><b data-variable="IDCD" data-value="${m.idcd ?? ''}">${f1(m.idcd)}</b></div></div></div>
      <div class="tile w e" data-variable="idcd" data-value="${m.idcd ?? ''}"><span class="micro" style="color:#0284c7">Competencia didáctica (IDCD)</span><div class="v" style="color:#0369a1">${f1(m.idcd)}</div>${badge(categorize(m.idcd))}</div>
    </div>
    <div class="contract"><span class="micro" style="color:#8a5a0a">Datos de lectura para el Diario de Campo</span><br/>APP <b>${esc(APP_META.name)}</b> · Clase <b>${cls ?? 'no declarada'}</b> · Esquema <b>4.0</b> · Archivo <b>${esc(reportFileName(name, certificateId))}</b><br/>Adjunta este archivo <u>sin modificarlo</u> en tu entrada del Diario de Campo (elige la APP «${esc(APP_META.name)}»${cls ? ` y la Clase ${cls}` : ''}). Las trazas de la sesión van incluidas en el mismo archivo.</div>

    <div class="sec"><h2><i style="background:#4f46e5"></i>1. DIMENSIÓN 1: Monitoreo Metacognitivo (Zimmerman &amp; Moylan, 2009)<span class="pill c-none" style="margin-left:auto" data-variable="IMMZ" data-value="${m.immz ?? ''}">IMMZ: ${f1(m.immz)}</span></h2>
      <div class="kpis3" data-testid="kpis-dim1"><div class="kpi3"><i>IMMZ-AO</i><b>${f1(m.immzAO)}</b></div><div class="kpi3"><i>IMMZ-AC</i><b>${f1(m.immzAC)}</b></div><div class="kpi3 g"><i>IMMZ Global</i><b>${f1(m.immz)}</b></div></div>
      <div class="verdict a"><span class="t">Veredicto Dimensión 1: ${esc(m.verdictA.status)}</span><em>${esc(m.verdictA.desc)}</em></div>
      <div class="sub">${subhead('A1', 'Autoobservación', 'Procesos de atención reflexiva, vigilancia cognitiva y detención deliberada previa a la acción (Zimmerman &amp; Moylan, 2009).', 'IMMZ-AO', m.immzAO, 'IMMZ-AO')}<div class="grid2">${ind('AO').map((i) => card(i, '#4f46e5')).join('')}</div></div>
      <div class="sub">${subhead('A2', 'Autocontrol', 'Estrategias de autorregulación activa durante la tarea: detección y autocorrección de errores, retroalimentación y resiliencia.', 'IMMZ-AC', m.immzAC, 'IMMZ-AC')}<div class="grid2">${ind('AC').map((i) => card(i, '#4f46e5')).join('')}</div></div></div>

    <div class="sec"><h2><i style="background:#0ea5e9"></i>2. ${esc(cfg.dimB.title)}<span class="pill c-none" style="margin-left:auto" data-variable="IDCD" data-value="${m.idcd ?? ''}">IDCD: ${f1(m.idcd)}</span></h2>
      <div class="kpis3"><div class="kpi3 e"><i>${esc(cfg.dimB.subIndexLabel)}</i><b>${f1(m.idcd)}</b></div></div>
      <div class="verdict b"><span class="t">Veredicto Dimensión 2: ${esc(m.verdictB.status)}</span><em>${esc(m.verdictB.desc)}</em></div>
      <div class="grid2">${ind('B').map((i) => card(i, '#0ea5e9')).join('')}</div></div>

    <div class="sec"><h2><i style="background:var(--brand)"></i>3. Mapeo DigCompEdu — Área 4: Evaluación y Retroalimentación</h2>
      <table><thead><tr><th>Competencia DigCompEdu</th><th>Descripción</th><th>Implementación en la App</th></tr></thead><tbody>
      <tr><td><b class="bt">4.1 Estrategias de evaluación</b></td><td>Diseño de instrumentos de evaluación diagnóstica, formativa y sumativa mediados digitalmente.</td><td>${esc(cfg.digcomp.implement41)}</td></tr>
      <tr><td><b class="bt">4.2 Analíticas de aprendizaje</b></td><td>Análisis de datos y evidencias sobre el desempeño del estudiantado para informar la enseñanza.</td><td>${esc(cfg.digcomp.implement42)}</td></tr>
      <tr><td><b class="bt">4.3 Retroalimentación y toma de decisiones</b></td><td>Ofrecer retroalimentación oportuna y usar la información para adaptar la enseñanza y apoyar la toma de decisiones del estudiante.</td><td>${esc(cfg.digcomp.implement43)}</td></tr></tbody></table></div>

    <div class="sec"><h2><i style="background:#64748b"></i>4. Hoja de trabajo y construcciones<span class="pill c-none" style="margin-left:auto">${stats.currentHits} / ${TOTAL_LANES} carriles correctos</span></h2>
      <div class="kpis5" data-testid="kpis-trabajo">${kpi5}</div>
      <p class="micro" style="margin:0 0 6px">Progresión por actividad</p>${progTable}
      <p class="micro" style="margin:16px 0 8px">Pantallazo de las producciones finales</p>${shots}<p class="micro" style="margin:16px 0 8px">Construcciones finales y mensaje encriptado</p>${ACTIVITIES.map(actBlock).join('')}
      <p class="micro" style="margin:16px 0 8px">Respuestas de formulación (TSD 1 · El Volantín)</p>${[1, 2, 3, 4].map((q) => answerBlock(`Pregunta ${q}`, FORMULATION_QUESTIONS[q - 1].subhead, FORMULATION_QUESTIONS[q - 1].enunciado, snap.answers[`q${q}` as 'q1'] || '', snap.formulationStates[q]?.devolutionLevel ?? 0, snap.formulationStates[q]?.revisionsCount ?? 0)).join('')}
      <p class="micro" style="margin:16px 0 8px">Anclajes conceptuales (TSD 2 y TSD 3)</p>${anclajes.map((x) => answerBlock(x.titulo, x.subhead, x.enunciado, x.respuesta, x.devoluciones_consultadas, x.revisiones)).join('')}</div>

    <div class="sec"><h2><i style="background:var(--brand)"></i>5. Bitácora de Monitoreo Activo</h2><p class="micro" style="text-transform:none;letter-spacing:0;margin:-4px 0 10px">Historial secuencial de vigilancia cognitiva capturado en tiempo real durante la construcción con regletas y la formulación.</p>
      <table><thead><tr><th style="width:90px">Hora</th><th style="width:210px">Acción registrada</th><th>Detalle del evento</th></tr></thead><tbody>${history.length ? history.slice().reverse().map((e) => { const [a, d] = eventLabel(e); return `<tr><td class="mono">${esc(new Date(e.timestamp).toLocaleTimeString('es-CL'))}</td><td><b class="bt">${esc(a)}</b></td><td>${esc(d)}</td></tr>`; }).join('') : '<tr><td colspan="3" style="text-align:center;font-style:italic;color:var(--mut)">No se han registrado interacciones aún.</td></tr>'}</tbody></table></div>

    <div class="sec note"><h3>Fundamentación teórica del diagnóstico</h3>${esc(cfg.foundation)}</div>
    <div class="foot"><span>© 2026 ${esc(INSTITUTION)}</span><span>${esc(APP_META.name)} v${APP_VERSION}</span></div>
  </div></div>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informe Laboratorio TSD · ${esc(name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
<script id="bct-report-payload" type="application/json">${json(payload)}</script>
<script id="tsd-report-raw-data" type="application/json">${json(raw)}</script>
<style>${REPORT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  return { html, bodyHtml, css: REPORT_CSS, fileName: reportFileName(name, certificateId), certificateId, payload, indicators, stats, indices: idx };
}

/** Autovalidación: lee el HTML generado con el parser del Diario y compara contra lo calculado. */
export function selfCheck(r: BuiltReport, expectedClass: number | null, expectedName: string): { ok: boolean; issues: string[]; parsed: ReturnType<typeof parseReportText> } {
  const p = parseReportText(r.html, r.fileName);
  const issues: string[] = [];
  const eq = (a: number | null | undefined, b: number | null | undefined) => (a ?? null) === (b ?? null);
  INDICATORS.forEach((d) => { const got = p.indicators.find((i) => i.id === d.id)?.value ?? null; const exp = r.indicators.find((i) => i.code === d.id)?.value ?? null; if (!eq(got, exp)) issues.push(`${d.id}: el Diario leería ${got} y la app calculó ${exp}`); });
  (['immz', 'immzAO', 'immzAC', 'idcd', 'immg'] as const).forEach((k) => { const exp = ({ immz: r.indices.immz, immzAO: r.indices.immzAO, immzAC: r.indices.immzAC, idcd: r.indices.idcd, immg: r.indices.immg })[k]; if (!eq(p[k], exp)) issues.push(`${k}: ${p[k]} ≠ ${exp}`); });
  if (p.classNumber !== expectedClass) issues.push(`Clase leída ${p.classNumber} ≠ ${expectedClass}`);
  if (p.simulator !== APP_META.name) issues.push(`APP leída «${p.simulator}» ≠ «${APP_META.name}»`);
  if (p.studentName !== expectedName.trim()) issues.push(`Nombre leído «${p.studentName}» ≠ «${expectedName.trim()}»`);
  if (p.sourceVersion !== '4.0') issues.push(`Esquema leído ${p.sourceVersion} ≠ 4.0`);
  if (!eq(p.apropiacion, r.stats.appropriation)) issues.push(`Apropiación leída ${p.apropiacion} ≠ ${r.stats.appropriation}`);
  if (p.aciertos !== r.stats.currentHits || p.errores !== r.stats.currentErrors || p.reflexiones !== r.stats.reflections) issues.push('Aciertos/errores/reflexiones leídos no coinciden con los calculados');
  if (!r.fileName.toLowerCase().startsWith(APP_META.filenamePrefix.toLowerCase())) issues.push('El nombre de archivo no comienza con el prefijo esperado');
  return { ok: issues.length === 0, issues, parsed: p };
}
