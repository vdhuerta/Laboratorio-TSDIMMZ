import { APP_META, APP_VERSION, COMPAT_4_0_IDS, INDICATORS, INSTITUTION } from '../config';
import { PHASES_CONFIG, type Card, type Forma } from '../data/cards';
import { categorize } from './immz/scoring';
import { parseReportText } from './immz/parser';
import { ICON_SVG } from './reportIcons';
import { buildAnalysisModel } from '../analysis/model';
import type { IndicatorView } from '../analysis/standard';
import { computeIndicators, computeStats, formulacionModo, indicesOf, type Board, type HistoryEvent, type IndicatorResult, type SessionStats } from './metrics';
import { ENGINE_VERSION } from '../immz-core/constants';
import type { ImmzCategory } from '../types';

/**
 * CONTRATO DE REPORTE IMMZ (esquema 4.0) — Diario de Campo ⇄ Simulador TSD
 * ───────────────────────────────────────────────────────────────────────────
 * 1. El PRIMER <script type="application/json"> del archivo es el payload canónico (id "bct-report-payload").
 *    El parser del Diario toma el primero que encuentra, por eso las trazas van DESPUÉS.
 * 2. Códigos IM1–IM10 del esquema 4.0 (nunca nombres): el parser los empareja por código.
 * 3. Claves duplicadas en camelCase y snake_case, porque el parser del Diario normaliza solo algunas
 *    (classNumber, participant.name, apropiacion, aciertos, errores, reflexiones, schemaVersion, scenarioName).
 * 4. Valores 0–100; null = sin evidencia. Los índices se calculan con el mismo scoring del Diario.
 * 5. Nombre de archivo: <prefijo>_<Nombre>_<ID>.html con prefijo = DEFAULT_APP_CONFIGS.filenamePrefix.
 */

export const CATEGORY_CLASS: Record<ImmzCategory, string> = { Inicial: 'c-ini', 'En Desarrollo': 'c-dev', Competente: 'c-com', Avanzado: 'c-adv' };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const f1 = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`);
const phaseName = (p: string) => PHASES_CONFIG[p as keyof typeof PHASES_CONFIG]?.title ?? p;

export interface ReportInput {
  participantName: string; classNumber: number | null; board: Board; history: HistoryEvent[]; now?: Date; certificateId?: string; judgmentEnabled: boolean;
  /** Forma del contenido activa en esta sesión (A/B/C) — ver src/data/cards.ts. */
  formId: Forma['id']; contentLevel: number; contentId: string; scenarioName: string;
}
export interface BuiltReport {
  html: string; bodyHtml: string; css: string; fileName: string; certificateId: string;
  payload: Record<string, unknown>; indicators: IndicatorResult[]; stats: SessionStats; indices: ReturnType<typeof indicesOf>;
}

export const makeCertificateId = (now: Date) => `${now.getFullYear()}${now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', '')}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
export const safeFileName = (name: string) => name.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Participante';
export const reportFileName = (name: string, id: string) => `${APP_META.filenamePrefix}${safeFileName(name)}_${id}.html`;

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
.logo{display:inline-flex;align-items:center;gap:8px}.logo i{position:relative;display:inline-block;width:28px;height:28px;border-radius:8px;background:var(--brand)}
.logo i:after{content:"";position:absolute;right:0;top:0;width:9px;height:9px;border-bottom-left-radius:6px;background:var(--accent)}
.pill{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:2px 10px;font-size:11px;background:#fff;color:var(--ink)}
.cid{font-family:ui-monospace,Menlo,monospace;background:var(--brand50);border-color:var(--brand100);color:var(--brand)}
.c-ini{background:#fff1f2;color:#be123c;border-color:#fecdd3}.c-dev{background:#fffbeb;color:#b45309;border-color:#fde68a}.c-com{background:#f0f9ff;color:#0369a1;border-color:#bae6fd}.c-adv{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.c-none{background:#f7f6f1;color:var(--mut)}
.tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:22px}
.tile{border:1px solid var(--line);border-radius:12px;padding:12px;background:#F7F6F1;min-width:0}
.tile .v{font-size:24px;font-weight:700;margin-top:4px}
.tile .s{font-size:10px;color:var(--mut);margin-top:2px}
.tile.a{background:#eef2ff;border-color:#e0e7ff}.tile.a .v{color:#312e81}.tile.b{background:#f0f9ff;border-color:#e0f2fe}.tile.b .v{color:#0c4a6e}.tile.g{background:var(--brand50);border-color:var(--brand100)}.tile.g .v{color:var(--brand)}
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
.phases{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.phase{border:1px solid var(--line);border-radius:10px;padding:10px;background:#F7F6F1}
.phase h3{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--brand);border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:8px}
.pc{border:1px solid;border-radius:8px;padding:8px;margin-bottom:6px;font-size:11px;break-inside:avoid}
.pc.ok{background:#ecfdf5cc;border-color:#a7f3d0}.pc.no{background:#fff1f2cc;border-color:#fecdd3}
.pc .k{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut)}
.pc .j{margin-top:4px;padding-top:4px;border-top:1px solid rgba(35,39,31,.08);font-size:9px;color:var(--mut);font-style:italic}
table{width:100%;border-collapse:collapse;font-size:11px}th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);font-weight:400}td{padding:8px;border-bottom:1px solid #EBEAE2;vertical-align:top}
.note{background:#F7F6F1;border:1px solid var(--line);border-radius:12px;padding:14px;font-size:11px;color:var(--mut)}
.note h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--brand);margin-bottom:6px}
.log{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #EBEAE2;padding:7px 0;font-size:11px}
.log .r{text-align:right;white-space:nowrap}.ok-t{color:#047857}.no-t{color:#be123c}.rf-t{color:#4338ca}
.foot{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);margin-top:24px;padding-top:12px;font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}
.tile.plain{background:#F7F6F1}.tile.w{background:#fff;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;border-color:var(--brand100)}.tile.w.e{border-color:#e0f2fe}.tile.w .v{font-size:22px}
.mini{display:grid;grid-template-columns:1fr 1fr;gap:4px;width:100%;margin-top:6px}.m1{background:#eef2ffcc;border:1px solid #e0e7ff;border-radius:6px;padding:3px}.m1 i{display:block;font-style:normal;font-size:7px;text-transform:uppercase;color:#4f46e5}.m1 b{font-size:12px;font-weight:700;color:#312e81}.m1.g{background:#F7F6F1;border-color:var(--line)}.m1.e{background:#f0f9ffcc;border-color:#e0f2fe}.m1.e i{color:#0284c7}.m1.e b{color:#075985}
.verdict.a{background:#eef2ff66;border-color:#e0e7ff}.verdict.b{background:#f0f9ff99;border-color:#e0f2fe}.verdict em{display:block}
.subval{white-space:nowrap;flex-shrink:0;background:#fff;border:1px solid #c7d2fe;border-radius:8px;padding:4px 10px;text-align:right}.subval b{display:block;font-size:11px;font-weight:700;color:#3730a3}
.chip{display:inline-block;margin-top:8px;background:var(--brand50);border:1px solid var(--brand100);border-radius:999px;padding:3px 10px;font-size:11px;color:var(--brand)}
.bt{font-weight:700}.mono{white-space:nowrap;font-family:ui-monospace,Menlo,monospace;color:var(--brand)}
.ttl{display:flex;align-items:center;gap:14px}.ico{position:relative;display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:12px;background:var(--brand);color:#fff;flex-shrink:0}.ico:after{content:"";position:absolute;right:0;top:0;width:11px;height:11px;border-bottom-left-radius:7px;background:var(--accent)}
.kpis3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.kpi3{border:1px solid #e0e7ff;background:#eef2ff;border-radius:12px;padding:8px 10px;text-align:center}.kpi3 i{display:block;font-style:normal;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#4f46e5}.kpi3 b{font-size:20px;font-weight:700;color:#3730a3}.kpi3.g{background:#e0e7ff;border-color:#c7d2fe}.kpi3.g b{color:#1e1b4b}.kpi3.e{background:#f0f9ff;border-color:#e0f2fe}.kpi3.e i{color:#0284c7}.kpi3.e b{color:#075985}
.kpis5{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}.kpi5{display:flex;align-items:center;justify-content:space-between;gap:6px;border:1px solid var(--line);border-radius:12px;padding:10px;background:#fff;break-inside:avoid}.kpi5 .kv{font-size:20px;font-weight:700;margin-top:3px}.kpi5 .kh{font-size:10px;color:var(--mut);line-height:1.3;margin-top:2px}.kic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;flex-shrink:0}
.k-brand .kv{color:var(--brand)}.k-brand .kic{background:var(--brand50);color:var(--brand)}.k-ok .kv{color:#059669}.k-ok .kic{background:#ecfdf5;color:#059669}.k-no .kv{color:#e11d48}.k-no .kic{background:#fff1f2;color:#e11d48}.k-sky .kv{color:#0284c7}.k-sky .kic{background:#f0f9ff;color:#0284c7}.k-amber .kv{color:#b45309}.k-amber .kic{background:var(--accentsoft);color:#b45309}
@media(max-width:720px){.kpis5{grid-template-columns:1fr 1fr}.kpis3{grid-template-columns:1fr}.kpi3.e{max-width:none}.tiles{grid-template-columns:1fr 1fr}.grid2{grid-template-columns:1fr}.phases{grid-template-columns:1fr 1fr}}
@media print{body{background:#fff}.wrap{padding:0}.sheet{border:none;box-shadow:none}}
`;

const verdict = (dim: 'A' | 'B', v: number | null) => {
  if (v === null) return dim === 'A' ? 'Aún no se registran acciones suficientes en la simulación para evaluar el monitoreo metacognitivo.' : 'Aún no se registran acciones suficientes en la simulación para evaluar la competencia didáctica TSD.';
  if (dim === 'A') return v >= 80 ? 'La estudiante supervisa activamente su comprensión durante el proceso, detecta errores mediante la retroalimentación del milieu y ajusta sus estrategias en tiempo real. El ciclo autocontrol → auto-observación → ajuste opera de manera fluida y autónoma.' : v >= 50 ? 'La estudiante muestra indicios de supervisión consciente de su aprendizaje, pero alterna entre momentos de monitoreo reflexivo y episodios de respuesta impulsiva. Se recomienda fortalecer las pausas de autodiagnóstico antes de cada decisión.' : 'Predomina un enfoque de ensayo y error sin supervisión consciente. La estudiante no aprovecha la retroalimentación inmediata para ajustar sus estrategias, lo que indica que el monitoreo metacognitivo requiere andamiaje externo deliberado.';
  return v >= 80 ? 'La estudiante demuestra comprensión sólida de la secuencia adidáctica de Brousseau, respetando el tiempo didáctico, argumentando racionalmente y distinguiendo con claridad las fases de acción, formulación, validación e institucionalización.' : v >= 50 ? 'Se observa comprensión parcial de la estructura adidáctica. La estudiante reconoce las fases pero presenta confusiones en los límites entre ellas, especialmente entre acción y formulación o entre validación e institucionalización.' : 'Dificultad para distinguir las fases de la TSD. Se observan deslizamientos metadidácticos frecuentes y tendencia a la institucionalización prematura del saber.';
};

const badge = (c: ImmzCategory | null) => `<span class="pill ${c ? CATEGORY_CLASS[c] : 'c-none'}">${c ?? 'Sin evidencia'}</span>`;

export function buildReport(input: ReportInput): BuiltReport {
  const now = input.now ?? new Date();
  const certificateId = input.certificateId ?? makeCertificateId(now);
  const name = input.participantName.trim();
  const { board, history } = input;
  const indicators = computeIndicators(history, board);
  // idxFull: motor 4.1, incluye IM11 (lo que ve la pantalla y el bloque immz41 del payload).
  // idxCompat: mismo cálculo que el Diario de hoy conoce — IM11 queda fuera para que
  // verify-immz.ts (que recalcula desde el parser del Diario) siga coincidiendo byte a byte.
  const idxFull = indicesOf(indicators);
  const idxCompat = indicesOf(indicators.filter((r) => r.code !== 'IM11'));
  const stats = computeStats(history, board);
  const duration = history.length ? Math.max(0, Math.round((now.getTime() - history[0].timestamp) / 1000)) : 0;
  const cls = input.classNumber;
  const im11 = indicators.find((r) => r.code === 'IM11') ?? null;

  // Array de compatibilidad 4.0: SOLO IM1–IM10, igual que siempre (el Diario los empareja por código).
  const payloadIndicators = COMPAT_4_0_IDS.map((id) => {
    const d = INDICATORS.find((x) => x.id === id)!;
    const r = indicators.find((x) => x.code === id)!;
    return { code: d.id, name: d.label, dimension: d.dimension, subdimension: d.sub, value: r.value, level: categorize(r.value), has_evidence: r.value !== null, evidence_n: r.denominator, feedback: r.feedback };
  });

  // ── Payload canónico (lo lee el Diario) ──
  const payload: Record<string, unknown> = {
    schema_version: '4.0', schemaVersion: '4.0', compat_schema: '4.0',
    app: { id: APP_META.id, name: APP_META.name, version: APP_VERSION },
    scenarioName: input.scenarioName,
    class_number: cls, classNumber: cls,
    participant: { name }, participant_name: name, participantName: name,
    certificate_id: certificateId,
    generatedAt: now.toISOString(), duration_seconds: duration,
    indicators: payloadIndicators,
    immz: idxCompat.immz, immz_ao: idxCompat.immzAO, immz_ac: idxCompat.immzAC, idcd: idxCompat.idcd, immg: idxCompat.immg, category: idxCompat.category,
    apropiacion: stats.appropriation, aciertos: stats.currentHits, errores: stats.currentErrors, reflexiones: stats.analyses, movimientos: stats.totalMoves,
    appropriation: { value: stats.appropriation, has_evidence: stats.hasEvidence, components: { accuracy: stats.accuracy, efficiency: stats.efficiency, reflection: stats.reflectionFactor }, weights: { accuracy: 0.5, efficiency: 0.25, reflection: 0.25 } },
    activity: { total_moves: stats.totalMoves, hits: stats.currentHits, errors: stats.currentErrors, analyses: stats.analyses, items_assigned: stats.itemsAssigned, items_total: stats.totalCards },
    // ── Bloque 4.1: extensión IMMZ-4.1 (el Diario de hoy no la conoce y la ignora). ──
    // form_id/content_level/content_id identifican la FORMA (A/B/C, TAREA 1-3 de contenido paralelo)
    // usada en esta sesión, para poder comparar sin que la repetición se vuelva memoria de la tarea.
    form_id: input.formId, content_level: input.contentLevel, content_id: input.contentId, session_seq: null,
    opportunity_target: {},
    engine_version: ENGINE_VERSION,
    immz41: {
      im11: im11 ? { value: im11.value, numerator: im11.numerator, denominator: im11.denominator, formula: im11.formula } : null,
      immz_ao: idxFull.immzAO, immz_ac: idxFull.immzAC, immz: idxFull.immz, idcd: idxFull.idcd, immg: idxFull.immg, category: idxFull.category,
      engine_version: ENGINE_VERSION,
      judgment_prompt: input.judgmentEnabled ? 'on' : 'off',
      im10_modo: formulacionModo(history),
    },
  };

  // ── Trazas crudas para la tesis (no las lee el parser: van en un segundo bloque) ──
  let prev: number | null = null;
  const trace = history.map((h, i) => {
    const dt = prev === null ? null : h.timestamp - prev; prev = h.timestamp;
    if (h.type === 'move') return { seq: i + 1, t: new Date(h.timestamp).toISOString(), ms: h.timestamp, dt_ms: dt, type: 'move', card_id: h.cardId, from: h.from, to: h.to, is_correct: h.isCorrect };
    if (h.type === 'analysis') return { seq: i + 1, t: new Date(h.timestamp).toISOString(), ms: h.timestamp, dt_ms: dt, type: 'analysis', card_id: h.cardId };
    return { seq: i + 1, t: new Date(h.timestamp).toISOString(), ms: h.timestamp, dt_ms: dt, type: 'judgment', card_id: h.cardId, declared: h.declared, real: h.real, calibrated: h.declared === h.real };
  });
  const raw = {
    schema: 'immz-trace/1', app: payload.app, certificate_id: certificateId, class_number: cls, participant_name: name,
    started_at: history.length ? new Date(history[0].timestamp).toISOString() : null, ended_at: now.toISOString(), duration_seconds: duration,
    indicator_evidence: indicators.map((r) => ({ code: r.code, value: r.value, numerator: r.numerator, denominator: r.denominator, formula: r.formula })),
    final_board: Object.fromEntries(Object.entries(board).map(([p, cs]) => [p, cs.map((c) => ({ card_id: c.id, correct_phase: c.correctPhase, is_correct: p === 'available' ? null : c.correctPhase === p }))])),
    trace,
  };
  const json = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

  // ── Cuerpo visual: ESTÁNDAR (mismo orden que la pantalla y que Rutinas Matematizadas) ──
  const m = buildAnalysisModel(history, board);
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
  const phases = Object.entries(board).filter(([p]) => p !== 'available');
  const ind = (sub: string) => m.indicators.filter((i) => (sub === 'B' ? i.dimension === 'B' : i.subdimension === sub));
  const ap = m.appropriation;
  const bodyHtml = `<div class="wrap"><div class="sheet">
    <div class="head"><div class="ttl"><span class="ico">${ICON_SVG.activity(22)}</span><div><span class="micro" style="color:var(--brand)">${esc(cfg.moduleLabel)}</span><h1>Análisis Metacognitivo</h1><p>${esc(cfg.reportSubtitle)}</p></div></div>
      <div style="text-align:right"><span class="pill cid">${esc(certificateId)}</span><p>Generado el ${esc(now.toLocaleDateString('es-CL'))} ${esc(now.toLocaleTimeString('es-CL'))}</p></div></div>

    <div class="tiles" id="tsd-summary-container" data-activity-total-moves="${stats.totalMoves}" data-activity-hits="${stats.currentHits}" data-activity-errors="${stats.currentErrors}" data-activity-analyses="${stats.analyses}">
      <div class="tile plain"><span class="micro">Participante / Diseñador</span><div class="v" style="font-size:15px;color:var(--brand)" id="tsd-participant-name" data-value="${esc(name)}">${esc(name) || 'No especificado'}</div><div class="s">${esc(INSTITUTION)}</div></div>
      <div class="tile w" data-variable="appropriation" data-value="${ap.value ?? ''}"><span class="micro" style="color:var(--brand)">Apropiación teórica</span><div class="v" style="color:var(--brand)">${ap.hasEvidence ? f1(ap.value) : 'Sin evidencia'}</div><div class="s">Exactitud ${ap.accuracy} % · Eficiencia ${ap.efficiency} % · Reflexión ${ap.reflectionFactor} %</div></div>
      <div class="tile w" data-variable="immg" data-value="${m.immg ?? ''}"><span class="micro" style="color:var(--brand)">Índice global (IMMG)</span><div class="v" style="color:var(--brand)">${f1(m.immg)}</div>${badge(idxFull.category)}</div>
      <div class="tile w"><span class="micro">Sub-índices metacognitivos</span><div class="mini"><div class="m1"><i>AO</i><b data-variable="IMMZ-AO" data-value="${m.immzAO ?? ''}">${f1(m.immzAO)}</b></div><div class="m1"><i>AC</i><b data-variable="IMMZ-AC" data-value="${m.immzAC ?? ''}">${f1(m.immzAC)}</b></div><div class="m1 g"><i>IMMZ</i><b data-variable="IMMZ" data-value="${m.immz ?? ''}">${f1(m.immz)}</b></div><div class="m1 e"><i>IDCD</i><b data-variable="IDCD" data-value="${m.idcd ?? ''}">${f1(m.idcd)}</b></div></div></div>
      <div class="tile w e" data-variable="idcd" data-value="${m.idcd ?? ''}"><span class="micro" style="color:#0284c7">Competencia didáctica (IDCD)</span><div class="v" style="color:#0369a1">${f1(m.idcd)}</div>${badge(categorize(m.idcd))}</div>
    </div>
    <div class="contract"><span class="micro" style="color:#8a5a0a">Datos de lectura para el Diario de Campo</span><br/>APP <b>${esc(APP_META.name)}</b> · Clase <b>${cls ?? 'no declarada'}</b> · Esquema <b>4.0</b> · Archivo <b>${esc(reportFileName(name, certificateId))}</b><br/>Adjunta este archivo <u>sin modificarlo</u> en tu entrada del Diario de Campo (elige la APP «${esc(APP_META.name)}»${cls ? ` y la Clase ${cls}` : ''}). Las trazas de la sesión van incluidas en el mismo archivo.</div>

    <div class="sec"><h2><i style="background:#4f46e5"></i>1. DIMENSIÓN 1: Monitoreo Metacognitivo (Zimmerman &amp; Moylan, 2009)<span class="pill c-none" style="margin-left:auto" data-variable="IMMZ" data-value="${m.immz ?? ''}">IMMZ: ${f1(m.immz)}</span></h2>
      <div class="kpis3" data-testid="kpis-dim1"><div class="kpi3"><i>IMMZ-AO</i><b>${f1(m.immzAO)}</b></div><div class="kpi3"><i>IMMZ-AC</i><b>${f1(m.immzAC)}</b></div><div class="kpi3 g"><i>IMMZ Global</i><b>${f1(m.immz)}</b></div></div>
      <div class="verdict a"><span class="t">Veredicto Dimensión 1: ${esc(m.verdictA.status)}</span><em>${esc(m.verdictA.desc)}</em></div>
      <div class="sub">${subhead('A1', 'Autoobservación', 'Procesos de atención reflexiva, vigilancia cognitiva y detención deliberada previa a la acción (Zimmerman &amp; Moylan, 2009).', 'IMMZ-AO', m.immzAO, 'IMMZ-AO')}<div class="grid2">${ind('AO').map((i) => card(i, '#4f46e5')).join('')}</div></div>
      <div class="sub">${subhead('A2', 'Autocontrol', 'Estrategias de autorregulación activa durante la tarea: detección y autocorrección de errores, retroalimentación y resiliencia.', 'IMMZ-AC', m.immzAC, 'IMMZ-AC')}<div class="grid2">${ind('AC').map((i) => card(i, '#4f46e5')).join('')}</div></div>
      <p class="micro" style="text-transform:none;letter-spacing:0;margin-top:10px">IM11 pertenece al bloque 4.1 del esquema (ver <code>immz41</code> en el payload); el Diario de Campo, mientras no se actualice a 4.1, calcula IMMZ-AO, IMMZ y los demás índices sin IM11.</p></div>

    <div class="sec"><h2><i style="background:#0ea5e9"></i>2. ${esc(cfg.dimB.title).replace('DIMENSIÓN 2: ', 'DIMENSIÓN 2: ')}<span class="pill c-none" style="margin-left:auto" data-variable="IDCD" data-value="${m.idcd ?? ''}">IDCD: ${f1(m.idcd)}</span></h2>
      <div class="kpis3"><div class="kpi3 e"><i>${esc(cfg.dimB.subIndexLabel)}</i><b>${f1(m.idcd)}</b></div></div>
      <div class="verdict b"><span class="t">Veredicto Dimensión 2: ${esc(m.verdictB.status)}</span><em>${esc(m.verdictB.desc)}</em></div>
      <div class="grid2">${ind('B').map((i) => card(i, '#0ea5e9')).join('')}</div></div>

    <div class="sec"><h2><i style="background:var(--brand)"></i>3. Mapeo DigCompEdu — Área 4: Evaluación y Retroalimentación</h2>
      <table><thead><tr><th>Competencia DigCompEdu</th><th>Descripción</th><th>Implementación en la App</th></tr></thead><tbody>
      <tr><td><b class="bt">4.1 Estrategias de evaluación</b></td><td>Diseño de instrumentos de evaluación diagnóstica, formativa y sumativa mediados digitalmente.</td><td>${esc(cfg.digcomp.implement41)}</td></tr>
      <tr><td><b class="bt">4.2 Analíticas de aprendizaje</b></td><td>Análisis de datos y evidencias sobre el desempeño del estudiantado para informar la enseñanza.</td><td>${esc(cfg.digcomp.implement42)}</td></tr>
      <tr><td><b class="bt">4.3 Retroalimentación y toma de decisiones</b></td><td>Ofrecer retroalimentación oportuna y usar la información para adaptar la enseñanza y apoyar la toma de decisiones del estudiante.</td><td>${esc(cfg.digcomp.implement43)}</td></tr></tbody></table></div>

    <div class="sec"><h2><i style="background:#64748b"></i>4. Hoja de trabajo y clasificación didáctica<span class="pill c-none" style="margin-left:auto">${stats.currentHits} / ${stats.itemsAssigned} aciertos</span></h2>
      <div class="kpis5" data-testid="kpis-trabajo">${([['Apropiación TSD', ap.hasEvidence ? f1(ap.value) : 'Sin evidencia', `Exactitud ${ap.accuracy}% · Efic. ${ap.efficiency}%`, ICON_SVG.grad, 'k-brand'], ['Aciertos (hoy)', String(stats.currentHits), 'Tarjetas en su fase correcta', ICON_SVG.check, 'k-ok'], ['Errores (hoy)', String(stats.currentErrors), 'Tarjetas fuera de su fase', ICON_SVG.x, 'k-no'], ['Movimientos', String(stats.totalMoves), 'Tarjetas arrastradas a una fase', ICON_SVG.click, 'k-sky'], ['Devoluciones', String(stats.analyses), 'Consultas con la lupa', ICON_SVG.search, 'k-amber']] as [string, string, string, (s?: number) => string, string][]).map(([l, v, h, ic, c]) => `<div class="kpi5 ${c}"><div><span class="micro">${l}</span><div class="kv">${v}</div><div class="kh">${h}</div></div><span class="kic">${ic(20)}</span></div>`).join('')}</div>
      <div class="phases">${phases.map(([p, cs]) => `<div class="phase" data-phase-id="${p}"><h3>${esc(phaseName(p))}</h3>${(cs as Card[]).map((c) => `<div class="pc ${c.correctPhase === p ? 'ok' : 'no'}"><span class="pill ${c.correctPhase === p ? 'c-adv' : 'c-ini'}" style="font-size:8px;padding:0 6px">${c.correctPhase === p ? 'Correcto' : 'Error'}</span><div class="k">${esc(c.type)}</div>${esc(c.content)}<div class="j">${esc(c.justification || '')}</div></div>`).join('') || '<p class="micro" style="text-align:center">Sin tarjetas</p>'}</div>`).join('')}</div></div>

    <div class="sec"><h2><i style="background:var(--brand)"></i>5. Bitácora de Monitoreo Activo</h2><p class="micro" style="text-transform:none;letter-spacing:0;margin:-4px 0 10px">Historial secuencial de vigilancia cognitiva capturado en tiempo real durante la clasificación de tarjetas.</p>
      <table><thead><tr><th style="width:90px">Hora</th><th style="width:160px">Acción registrada</th><th>Detalle del evento</th></tr></thead><tbody>${history.length ? history.slice().reverse().map((e) => {
        const label = e.type === 'move' ? (e.isCorrect ? 'Movimiento correcto' : 'Movimiento con error') : e.type === 'analysis' ? 'Devolución consultada' : e.declared === e.real ? 'Juicio calibrado (IM11)' : 'Juicio sin calibrar (IM11)';
        const detail = e.type === 'move' ? `«${esc(e.cardContent.length > 70 ? e.cardContent.slice(0, 70) + '…' : e.cardContent)}» → ${esc(phaseName(e.to))}` : e.type === 'analysis' ? `«${esc(e.cardContent.length > 70 ? e.cardContent.slice(0, 70) + '…' : e.cardContent)}»` : `Declaró "${e.declared ? 'Sí' : 'No'}" · resultado real: "${e.real ? 'Sí' : 'No'}"`;
        return `<tr><td class="mono">${esc(new Date(e.timestamp).toLocaleTimeString('es-CL'))}</td><td><b class="bt">${label}</b></td><td>${detail}</td></tr>`;
      }).join('') : '<tr><td colspan="3" style="text-align:center;font-style:italic;color:var(--mut)">No se han registrado interacciones aún.</td></tr>'}</tbody></table></div>

    <div class="sec note"><h3>Fundamentación teórica del diagnóstico</h3>${esc(cfg.foundation)}</div>
    <div class="foot"><span>© 2026 ${esc(INSTITUTION)}</span><span>${esc(APP_META.name)} v${APP_VERSION}</span></div>
  </div></div>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informe de Simulación TSD · ${esc(name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
<script id="bct-report-payload" type="application/json">${json(payload)}</script>
<script id="tsd-report-raw-data" type="application/json">${json(raw)}</script>
<style>${REPORT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  return { html, bodyHtml, css: REPORT_CSS, fileName: reportFileName(name, certificateId), certificateId, payload, indicators, stats, indices: idxCompat };
}

/** Autovalidación: lee el HTML generado con el parser del Diario y compara contra lo calculado. */
export function selfCheck(r: BuiltReport, expectedClass: number | null, expectedName: string): { ok: boolean; issues: string[]; parsed: ReturnType<typeof parseReportText> } {
  const p = parseReportText(r.html, r.fileName);
  const issues: string[] = [];
  const eq = (a: number | null | undefined, b: number | null | undefined) => (a ?? null) === (b ?? null);
  // Solo IM1–IM10: el Diario de hoy no conoce IM11 (vive en el bloque immz41, fuera del contrato 4.0).
  COMPAT_4_0_IDS.forEach((id) => { const d = INDICATORS.find((x) => x.id === id)!; const got = p.indicators.find((i) => i.id === d.id)?.value ?? null; const exp = r.indicators.find((i) => i.code === d.id)?.value ?? null; if (!eq(got, exp)) issues.push(`${d.id}: el Diario leería ${got} y la app calculó ${exp}`); });
  (['immz', 'immzAO', 'immzAC', 'idcd', 'immg'] as const).forEach((k) => { const exp = ({ immz: r.indices.immz, immzAO: r.indices.immzAO, immzAC: r.indices.immzAC, idcd: r.indices.idcd, immg: r.indices.immg })[k]; if (!eq(p[k], exp)) issues.push(`${k}: ${p[k]} ≠ ${exp}`); });
  if (p.classNumber !== expectedClass) issues.push(`Clase leída ${p.classNumber} ≠ ${expectedClass}`);
  if (p.simulator !== APP_META.name) issues.push(`APP leída «${p.simulator}» ≠ «${APP_META.name}»`);
  if (p.studentName !== expectedName.trim()) issues.push(`Nombre leído «${p.studentName}» ≠ «${expectedName.trim()}»`);
  if (p.sourceVersion !== '4.0') issues.push(`Esquema leído ${p.sourceVersion} ≠ 4.0`);
  if (!eq(p.apropiacion, r.stats.appropriation)) issues.push(`Apropiación leída ${p.apropiacion} ≠ ${r.stats.appropriation}`);
  if (!r.fileName.toLowerCase().startsWith(APP_META.filenamePrefix.toLowerCase())) issues.push('El nombre de archivo no comienza con el prefijo esperado');
  return { ok: issues.length === 0, issues, parsed: p };
}
