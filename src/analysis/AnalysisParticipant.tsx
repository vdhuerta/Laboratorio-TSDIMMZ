import { useState } from 'react';
import { Award, BookOpen, CheckSquare, ChevronDown, Cpu, FileSpreadsheet, FileText, GraduationCap, Info, MessageSquare, RefreshCw, Sparkles, Timer, Workflow, Zap, type LucideIcon } from 'lucide-react';
import { categorize } from '../lib/immz/scoring';
import { CatBadge } from '../components/ui';
import type { AnalysisModel, IndicatorView } from './standard';

/**
 * Secciones del Análisis del Participante (estándar de las 5 apps). Cada sección es una pestaña en AnalysisView.
 * Colores: chrome = verde institucional del Diario (brand) + ámbar (accent); datos = índigo (Dim. A) y celeste (Dim. B),
 * igual que ImmzPreview del Diario. Tipografía: Inter; solo los títulos en negrita (font-title / h1–h6).
 */
const ICONS: Record<string, LucideIcon> = { IM1: Timer, IM2: FileText, IM3: RefreshCw, IM4: MessageSquare, IM5: Award, IM6: Workflow, IM7: Cpu, IM8: Zap, IM9: CheckSquare, IM10: BookOpen };
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`);
const nivel = (v: number | null) => categorize(v) ?? 'Sin evidencia';
const TONE = {
  A: { icon: 'bg-indigo-50 text-indigo-600', bar: 'bg-indigo-500', label: 'text-indigo-600', link: 'text-indigo-600' },
  B: { icon: 'bg-sky-50 text-sky-600', bar: 'bg-sky-500', label: 'text-sky-600', link: 'text-sky-700' },
} as const;

function IndicatorCard({ ind }: { ind: IndicatorView }) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[ind.code]; const t = TONE[ind.dimension];
  return (
    <div className="card flex flex-col justify-between p-5 transition hover:shadow-sm" data-im={ind.code}>
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2.5 ${t.icon}`}><Icon size={18} /></div>
            <div className="min-w-0"><h4 className="text-[13px] leading-snug text-slate-900">{ind.name}</h4><span className="micro mt-0.5 block !normal-case !tracking-normal">{ind.authors}</span></div>
          </div>
          <div className="shrink-0 text-right"><span className="block text-xl text-slate-900 font-title" data-im-value={ind.value ?? ''}>{pct(ind.value)}</span><span className="mt-1 inline-block"><CatBadge cat={categorize(ind.value)} /></span></div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-600">{ind.description}</p>
        {ind.breakdown && <div className="pill mt-2.5 gap-1.5 border-brand-100 bg-brand-50 text-brand-500"><Sparkles size={13} className="shrink-0" />{ind.breakdown}</div>}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all duration-700 ${t.bar}`} style={{ width: `${ind.value ?? 0}%` }} /></div>
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3"><span className={`micro mb-1 block ${t.label}`}>Diagnóstico cualitativo</span><p className="text-xs italic leading-relaxed text-slate-700">{ind.feedback}</p></div>
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <button onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 text-xs hover:opacity-80 ${t.link}`} aria-expanded={open}><FileSpreadsheet size={14} />{open ? 'Ocultar fórmula teórica' : 'Ver fórmula y tip didáctico'}<ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} /></button>
        {open && (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            <div><span className="block text-slate-900 font-title">Fórmula de monitoreo</span><code className="mt-1 block w-fit rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-brand-500">{ind.formula}</code></div>
            <div className="border-t border-slate-200 pt-2"><span className="block text-slate-900 font-title">Marco de referencia</span><p className="italic text-slate-500">{ind.authors}</p></div>
            <div className="border-t border-slate-200 pt-2"><span className="block text-brand-500 font-title">Tip orientador</span><p className="text-slate-700">{ind.tip}</p></div>
          </div>)}
      </div>
    </div>
  );
}

function SubHeader({ code, title, blurb, label, value }: { code: string; title: string; blurb: string; label: string; value: number | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3.5">
      <div className="min-w-0"><h4 className="text-sm text-slate-900">Subdimensión {code} — {title}</h4><p className="mt-0.5 text-xs text-indigo-700">{blurb}</p></div>
      <div className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3.5 py-1 text-right"><span className="block text-sm text-indigo-800 font-title">{label}: {pct(value)}</span><span className="micro block !text-indigo-600">{nivel(value)}</span></div>
    </div>
  );
}
const Verdict = ({ x, dim }: { x: { status: string; desc: string }; dim: 1 | 2 }) => (
  <div className={`rounded-xl border p-4 ${dim === 1 ? 'border-indigo-100 bg-indigo-50/60' : 'border-sky-100 bg-sky-50/60'}`}>
    <span className={`micro mb-1 block ${dim === 1 ? '!text-indigo-700' : '!text-sky-700'}`}>Veredicto Dimensión {dim}: {x.status}</span><p className="text-xs italic leading-relaxed text-slate-800">{x.desc}</p></div>);

/* ── 1 · Resumen: Apropiación + IMMG + texto explicativo ── */
export function SummarySection({ m }: { m: AnalysisModel }) {
  const ap = m.appropriation; const cfg = m.cfg; const immg = m.immg ?? 0;
  return (
    <div className="space-y-6" data-testid="sec-resumen">
      <div className="card relative overflow-hidden p-6" data-testid="apropiacion-card">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-brand-500" />
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-1.5"><div className="flex items-center gap-2"><GraduationCap size={20} className="text-brand-500" /><h3 className="text-lg text-slate-900">Apropiación Teórica</h3></div><p className="text-sm leading-relaxed text-slate-600">{cfg.appropriation.blurb}</p></div>
          <div className="flex w-full shrink-0 flex-col items-start rounded-xl border border-slate-200 bg-slate-50 p-4 md:w-auto md:items-end">
            {ap.hasEvidence && ap.value !== null ? (<><span className="text-4xl text-brand-500 font-title" data-testid="apropiacion">{ap.value}%</span><span className="mt-1 text-xs text-slate-600">Exactitud {ap.accuracy} % · Eficiencia {ap.efficiency} % · Reflexión {ap.reflectionFactor} %</span></>)
              : (<><span className="text-2xl text-slate-400 font-title" data-testid="apropiacion">Sin evidencia</span><span className="mt-1 text-xs text-slate-400">Exactitud — · Eficiencia — · Reflexión —</span></>)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card relative flex flex-col items-center justify-center overflow-hidden p-6 text-center lg:col-span-1">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-accent" />
          <h3 className="micro mb-5 leading-relaxed">Índice de Monitoreo Metacognitivo Global (IMMG)</h3>
          <div className="relative flex h-40 w-40 items-center justify-center">
            <svg className="h-full w-full -rotate-90"><circle cx="80" cy="80" r="70" stroke="#EBEAE2" strokeWidth="12" fill="transparent" /><circle cx="80" cy="80" r="70" stroke="#24473A" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * immg) / 100} strokeLinecap="round" className="transition-all duration-700" /></svg>
            <div className="absolute flex flex-col items-center"><span className="text-4xl text-slate-900 font-title" data-testid="immg">{m.immg === null ? '—' : `${Math.round(m.immg)}%`}</span><span className="micro mt-1 !text-brand-500">Nivel global</span></div>
          </div>
          <div className="mt-5 flex w-full flex-col items-center gap-2"><CatBadge cat={categorize(m.immg)} /><div className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Veredicto general<strong className="mt-0.5 block text-brand-500 font-title">{m.verdictGlobal}</strong></div></div>
        </div>
        <div className="card flex flex-col justify-between bg-slate-50 p-6 lg:col-span-2">
          <div><div className="mb-3 flex items-center gap-2"><Cpu size={20} className="text-brand-500" /><h3 className="text-lg text-slate-900">{cfg.gaugeIntro.title}</h3></div><p className="text-sm leading-relaxed text-slate-600">{cfg.gaugeIntro.p1}</p></div>
          <div className="mt-5 flex items-center gap-1.5 border-t border-slate-200 pt-4 text-xs text-brand-500"><Info size={15} /><span>{cfg.gaugeIntro.hint}</span></div>
        </div>
      </div>
    </div>
  );
}

/* ── 2 · Dimensión 1 ── */
export function DimASection({ m }: { m: AnalysisModel }) {
  // Los tres KPI tienen exactamente el mismo ancho (w-32) y la misma altura.
  const box = (label: string, val: number | null, strong = false) => (
    <div data-kpi="immz" className={`w-32 shrink-0 rounded-xl border px-3 py-1.5 text-center ${strong ? 'border-indigo-300 bg-indigo-100' : 'border-indigo-100 bg-indigo-50'}`}><span className="micro block !text-indigo-600">{label}</span><span className={`text-xl font-title ${strong ? 'text-indigo-900' : 'text-indigo-700'}`}>{pct(val)}</span></div>);
  return (
    <div className="card space-y-6 p-6" data-testid="dim-a">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div><span className="micro mb-1 block !text-indigo-600">Evaluación de Proceso Cíclico</span><h3 className="text-base text-slate-900">DIMENSIÓN 1: Monitoreo Metacognitivo (Zimmerman &amp; Moylan, 2009)</h3></div>
        <div className="flex flex-wrap items-center gap-2">{box('IMMZ-AO', m.immzAO)}{box('IMMZ-AC', m.immzAC)}{box('IMMZ Global', m.immz, true)}</div>
      </div>
      <Verdict x={m.verdictA} dim={1} />
      <div className="space-y-4"><SubHeader code="A1" title="Autoobservación" blurb="Procesos de atención reflexiva, vigilancia cognitiva y detención deliberada previa a la acción (Zimmerman & Moylan, 2009)." label="IMMZ-AO" value={m.immzAO} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{m.indicators.filter((i) => i.subdimension === 'AO').map((i) => <IndicatorCard key={i.code} ind={i} />)}</div></div>
      <div className="space-y-4 border-t border-slate-100 pt-5"><SubHeader code="A2" title="Autocontrol" blurb="Estrategias de autorregulación activa durante la tarea: detección y autocorrección de errores, retroalimentación y resiliencia." label="IMMZ-AC" value={m.immzAC} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{m.indicators.filter((i) => i.subdimension === 'AC').map((i) => <IndicatorCard key={i.code} ind={i} />)}</div></div>
    </div>
  );
}

/* ── 3 · Dimensión 2 ── */
export function DimBSection({ m }: { m: AnalysisModel }) {
  const cfg = m.cfg;
  return (
    <div className="card space-y-6 p-6" data-testid="dim-b">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div><span className="micro mb-1 block !text-sky-600">{cfg.dimB.kicker}</span><h3 className="text-base text-slate-900">{cfg.dimB.title}</h3></div>
        <div data-kpi="idcd" className="w-32 shrink-0 rounded-xl border border-sky-100 bg-sky-50 px-3 py-1.5 text-center"><span className="micro block !text-sky-600">{cfg.dimB.subIndexLabel}</span><span className="text-xl text-sky-700 font-title">{pct(m.idcd)}</span></div>
      </div>
      <Verdict x={m.verdictB} dim={2} />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{m.indicators.filter((i) => i.dimension === 'B').map((i) => <IndicatorCard key={i.code} ind={i} />)}</div>
    </div>
  );
}

/* ── 4 · DigCompEdu + Fundamentación ── */
export function FrameworkSection({ m }: { m: AnalysisModel }) {
  const cfg = m.cfg;
  const rows = [['4.1 Estrategias de evaluación', 'Diseño de instrumentos de evaluación diagnóstica, formativa y sumativa mediados digitalmente.', cfg.digcomp.implement41], ['4.2 Analíticas de aprendizaje', 'Análisis de datos y evidencias sobre el desempeño del estudiantado para informar la enseñanza.', cfg.digcomp.implement42], ['4.3 Retroalimentación y toma de decisiones', 'Ofrecer retroalimentación oportuna y usar la información para adaptar la enseñanza y apoyar la toma de decisiones del estudiante.', cfg.digcomp.implement43]];
  return (
    <div className="space-y-6" data-testid="sec-marco">
      <div className="card space-y-4 p-6">
        <div><span className="micro mb-1 block !text-brand-500">Marco de Competencia Profesional Docente</span><h3 className="text-base text-slate-900">Mapeo DigCompEdu — Área 4: Evaluación y Retroalimentación</h3><p className="mt-1 text-xs text-slate-500">Articulación entre las funcionalidades de la aplicación y el marco europeo de competencia digital docente (Redecker, 2017).</p></div>
        <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[600px] border-collapse text-left"><thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-500"><th className="w-1/4 p-3 uppercase tracking-wider">Competencia DigCompEdu</th><th className="w-1/3 p-3 uppercase tracking-wider">Descripción</th><th className="p-3 uppercase tracking-wider">Implementación en la App</th></tr></thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">{rows.map(([a, b, c]) => (<tr key={a}><td className="p-3 text-slate-900"><div className="flex items-center gap-2"><span className="h-3 w-1.5 rounded-sm bg-brand-500" /><span className="font-title">{a}</span></div></td><td className="p-3 leading-relaxed text-slate-600">{b}</td><td className="p-3 leading-relaxed text-slate-600">{c}</td></tr>))}</tbody></table></div>
      </div>
      <div className="card bg-slate-50 p-6"><h4 className="micro mb-2 !text-brand-500">Fundamentación Teórica del Diagnóstico</h4><p className="text-sm leading-relaxed text-slate-600">{cfg.foundation}</p></div>
    </div>
  );
}
