import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, BookMarked, CheckCircle2, Download, MousePointerClick, Search, XCircle, FileText, GraduationCap, History, Layers, Layout, ShieldCheck, Target, Brain, type LucideIcon } from 'lucide-react';
import { PHASES_CONFIG, type Card, type Forma } from '../data/cards';
import { computeStats, type Board, type HistoryEvent } from '../lib/metrics';
import { buildReport, selfCheck } from '../lib/immzReport';
import { downloadHtml, downloadPdf } from '../lib/download';
import { buildAnalysisModel } from '../analysis/model';
import { DimASection, DimBSection, FrameworkSection, SummarySection } from '../analysis/AnalysisParticipant';
import { fmtPct } from '../components/ui';

type Tab = 'RESUMEN' | 'DIM1' | 'DIM2' | 'MARCO' | 'TRABAJO';
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'RESUMEN', label: 'Resumen', icon: GraduationCap },
  { key: 'DIM1', label: 'Dimensión 1 · IMMZ', icon: Brain },
  { key: 'DIM2', label: 'Dimensión 2 · IDCD', icon: Layers },
  { key: 'MARCO', label: 'DigCompEdu y Fundamento', icon: BookMarked },
  { key: 'TRABAJO', label: 'Hoja de Trabajo', icon: Layout },
];
interface Props { history: HistoryEvent[]; board: Board; classNumber: number | null; name: string; onName: (n: string) => void; onClear: () => void; judgmentEnabled: boolean; forma: Forma }

export default function AnalysisView({ history, board, classNumber, name, onName, onClear, judgmentEnabled, forma }: Props) {
  const [tab, setTab] = useState<Tab>('RESUMEN');
  const [askName, setAskName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ file: string; ok: boolean; issues: string[] } | null>(null);
  const model = useMemo(() => buildAnalysisModel(history, board), [history, board]);
  const stats = useMemo(() => computeStats(history, board), [history, board]);
  // Vista previa EXACTA de lo que leerá el Diario (mismo parser y scoring).
  const check = useMemo(() => { const r = buildReport({ participantName: name || 'Participante', classNumber, board, history, judgmentEnabled, formId: forma.id, contentLevel: forma.contentLevel, contentId: forma.contentId, scenarioName: forma.nombre }); return selfCheck(r, classNumber, name || 'Participante'); }, [history, board, classNumber, name, judgmentEnabled, forma]);
  const parsed = check.parsed;

  const generate = async (kind: 'html' | 'pdf') => {
    if (!name.trim()) { setAskName(true); return; }
    setBusy(true);
    try {
      const r = buildReport({ participantName: name, classNumber, board, history, judgmentEnabled, formId: forma.id, contentLevel: forma.contentLevel, contentId: forma.contentId, scenarioName: forma.nombre });
      const c = selfCheck(r, classNumber, name);
      setLast({ file: r.fileName, ok: c.ok, issues: c.issues });
      if (kind === 'html') downloadHtml(r.html, r.fileName); else await downloadPdf(r);
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      {/* Título del componente en caja */}
      <header className="card relative mb-5 p-5 pl-7" data-testid="analysis-header">
        <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-xl bg-brand-500" />
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white"><Activity size={22} /><span className="absolute right-0 top-0 h-3 w-3 rounded-bl-md bg-accent" /></div>
            <div className="min-w-0"><p className="micro">{model.cfg.moduleLabel}</p><h2 className="mt-0.5 text-2xl text-slate-900">Análisis del Participante</h2><p className="mt-0.5 text-sm text-slate-500">{model.cfg.title} · {model.cfg.subtitle}</p></div>
          </div>
          <div className="relative flex w-full shrink-0 flex-col items-stretch gap-2 md:w-auto md:items-end">
            <div className="flex gap-2">
              <button onClick={() => setAskName((p) => !p)} disabled={busy} data-testid="btn-html" className="btn-primary"><Download size={14} />Descargar Análisis IMMZ (HTML)</button>
              <button onClick={() => generate('pdf')} disabled={busy} className="btn-ghost"><FileText size={14} />PDF</button>
            </div>
            {askName && (
              <div className="card z-30 flex w-full flex-col gap-2 p-4 shadow-lg md:absolute md:right-0 md:top-full md:mt-2 md:w-96">
                <div className="flex items-center justify-between"><label htmlFor="pname" className="label !mb-0">Nombre del participante *</label>{!name.trim() && <span className="micro !text-rose-500">Requerido</span>}</div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="pname" autoFocus type="text" value={name} onChange={(e) => onName(e.target.value)} placeholder="Ej. María González" className={`input ${!name.trim() ? '!border-rose-300' : ''}`} />
                  <button onClick={() => { setAskName(false); generate('html'); }} disabled={!name.trim() || busy} className="btn-primary shrink-0 justify-center whitespace-nowrap">Descarga ahora</button>
                </div>
                {!name.trim() && <p className="text-[11px] text-slate-500">Ingresa tu nombre para habilitar la descarga del análisis.</p>}
              </div>)}
          </div>
        </div>
        <p className={`mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs ${check.ok ? 'text-emerald-700' : 'text-amber-700'}`} data-testid="compat">{check.ok ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}{check.ok ? <>Compatible con el Diario de Campo · leerá IMMZ {fmtPct(parsed.immz)} · IDCD {fmtPct(parsed.idcd)} · IMMG {fmtPct(parsed.immg)}</> : <>Revisar compatibilidad: {check.issues.join(' · ')}</>}</p>
      </header>

      {/* Pestañas (mismo control segmentado del Diario) */}
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs" role="tablist">
        {TABS.map(({ key, label, icon: I }) => <button key={key} role="tab" aria-selected={tab === key} data-testid={`atab-${key}`} onClick={() => setTab(key)} className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] transition ${tab === key ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><I size={15} />{label}</button>)}
      </div>

      {tab === 'RESUMEN' && <SummarySection m={model} />}
      {tab === 'DIM1' && <DimASection m={model} />}
      {tab === 'DIM2' && <DimBSection m={model} />}
      {tab === 'MARCO' && <FrameworkSection m={model} />}
      {tab === 'TRABAJO' && (
        <div className="space-y-6" data-testid="trabajo-tab">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" data-testid="kpis-trabajo">
            {([
              ['Apropiación TSD', stats.hasEvidence ? `${stats.appropriation}%` : 'Sin evidencia', `Exactitud ${stats.accuracy}% · Efic. ${stats.efficiency}%`, GraduationCap, 'text-brand-500', 'bg-brand-50'],
              ['Aciertos (hoy)', String(stats.currentHits), 'Tarjetas en su fase correcta', CheckCircle2, 'text-emerald-600', 'bg-emerald-50'],
              ['Errores (hoy)', String(stats.currentErrors), 'Tarjetas fuera de su fase', XCircle, 'text-rose-500', 'bg-rose-50'],
              ['Movimientos', String(stats.totalMoves), 'Tarjetas arrastradas a una fase', MousePointerClick, 'text-sky-600', 'bg-sky-50'],
              ['Devoluciones', String(stats.analyses), 'Consultas con la lupa', Search, 'text-amber-700', 'bg-accent-soft'],
            ] as [string, string, string, LucideIcon, string, string][]).map(([label, value, hint, Icon, tone, bg]) => (
              <div key={label} className="card flex items-center justify-between gap-3 p-4" data-kpi={label}>
                <div className="min-w-0"><p className="micro">{label}</p><p className={`mt-1.5 text-2xl font-title ${tone}`}>{value}</p><p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p></div>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${tone}`}><Icon size={22} /></div>
              </div>))}
          </div>
          <section className="card p-6"><h3 className="mb-4 flex items-center gap-2 text-base text-slate-900"><Layout size={16} className="text-slate-400" />Hoja de trabajo y clasificación didáctica</h3>
            <div className="grid gap-3 md:grid-cols-2">{Object.entries(board).filter(([p]) => p !== 'available').map(([p, cs]) => (
              <div key={p} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="micro mb-2 !text-brand-500">{PHASES_CONFIG[p as keyof typeof PHASES_CONFIG].title}</p>
                <div className="space-y-1.5">{cs.length === 0 ? <p className="micro py-2">Sin tarjetas asignadas</p> : (cs as Card[]).map((c) => (
                  <div key={c.id} className={`flex items-center justify-between gap-2 rounded-lg border bg-white p-2 ${c.correctPhase === p ? 'border-emerald-200' : 'border-rose-200'}`}><div className="min-w-0"><p className="micro !text-[9px]">{c.type}</p><p className="truncate text-xs text-slate-700">{c.content}</p></div>{c.correctPhase === p ? <CheckCircle2 size={14} className="shrink-0 text-emerald-500" /> : <AlertTriangle size={14} className="shrink-0 text-rose-400" />}</div>))}</div></div>))}</div></section>
          <section className="card p-6"><h3 className="mb-1 flex items-center gap-2 text-base text-slate-900"><History size={16} className="text-slate-400" />Bitácora de Monitoreo Activo</h3><p className="mb-4 text-xs text-slate-500">Historial secuencial de vigilancia cognitiva capturado en tiempo real durante la clasificación de tarjetas.</p>
            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200"><table className="w-full border-collapse text-left"><thead className="sticky top-0"><tr className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-500"><th className="w-24 p-3">Hora</th><th className="w-44 p-3">Acción registrada</th><th className="p-3">Detalle del evento</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">{history.length === 0 ? <tr><td colSpan={3} className="p-6 text-center italic text-slate-400">No se han registrado interacciones aún.</td></tr> : history.slice().reverse().map((e, i) => (
                <tr key={i}><td className="whitespace-nowrap p-3 font-mono text-brand-500">{new Date(e.timestamp).toLocaleTimeString('es-CL')}</td>
                  <td className="p-3 text-slate-900">{e.type === 'move' ? (e.isCorrect ? 'Movimiento correcto' : 'Movimiento con error') : e.type === 'analysis' ? 'Devolución consultada' : e.declared === e.real ? 'Juicio calibrado' : 'Juicio sin calibrar'}</td>
                  <td className="p-3 leading-relaxed text-slate-600">{e.type === 'move' ? `«${e.cardContent.slice(0, 70)}…» → ${PHASES_CONFIG[e.to as keyof typeof PHASES_CONFIG]?.short ?? e.to}` : e.type === 'analysis' ? `«${e.cardContent.slice(0, 70)}…»` : `Declaró "${e.declared ? 'Sí' : 'No'}" · resultado real: "${e.real ? 'Sí' : 'No'}"`}</td></tr>))}</tbody></table></div></section>
          <section className="card bg-slate-50 p-6"><h3 className="micro mb-3 flex items-center gap-2 !text-brand-500"><Target size={14} />Lo que verá el Diario de Campo</h3>
            <ul className="space-y-1 text-sm text-slate-600"><li><b>APP:</b> {parsed.simulator} · escenario «{parsed.scenarioName}»</li><li><b>Clase declarada:</b> {parsed.classNumber ?? '—'} · <b>Esquema:</b> {parsed.sourceVersion} → V4</li><li><b>Participante:</b> {name.trim() ? parsed.studentName : '— (se pedirá al descargar)'}</li><li><b>Apropiación:</b> {fmtPct(parsed.apropiacion ?? null)} · aciertos {parsed.aciertos} · errores {parsed.errores} · reflexiones {parsed.reflexiones}</li>{last && <li><b>Último archivo:</b> <span className="font-mono text-xs">{last.file}</span> {last.ok ? '✓ verificado' : '⚠ ' + last.issues.join(', ')}</li>}</ul>
            {parsed.warnings.length > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><p className="mb-1 flex items-center gap-1.5 font-title"><AlertTriangle size={13} />Avisos de normalización (igual que en el Diario)</p><ul className="list-disc pl-5">{parsed.warnings.slice(0, 6).map((w, i) => <li key={i}>{w}</li>)}</ul></div>}</section>
        </div>)}
      <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4"><button className="micro !text-rose-500 hover:!text-rose-600" onClick={() => { if (confirm('¿Borrar todo el historial de movimientos?')) onClear(); }}>Borrar historial</button><span className="micro">{history.length} eventos en la traza</span></div>
    </div>
  );
}
