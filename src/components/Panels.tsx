import { useState } from 'react';
import { ArrowLeft, Bookmark, Brain, CheckCircle2, ChevronRight, FlaskConical, HelpCircle, Lock, MessageSquare, Sparkles } from 'lucide-react';
import { ANCHOR_CONFIGS, FORMULATION_QUESTIONS } from '../data/lab';
import type { AnchorState, FormulationAnswers, FormulationQuestionState } from '../labTypes';

const Devolutions = ({ items, level }: { items: string[]; level: number }) => (
  <div className="space-y-2">{items.slice(0, level).map((t, i) => (
    <div key={i} className="rounded-xl border border-accent/30 bg-accent-soft p-3" data-testid="devolution-text">
      <p className="micro mb-1 flex items-center gap-1.5 !text-amber-700"><Sparkles size={11} />Devolución {i + 1}</p><p className="text-xs leading-relaxed text-slate-800">{t}</p></div>))}</div>
);
const Exhausted = ({ onOpen, text }: { onOpen: () => void; text: string }) => (
  <div className="flex flex-col items-center justify-between gap-3 rounded-xl bg-brand-500 p-4 text-white sm:flex-row">
    <div><p className="micro !text-accent">Devoluciones agotadas</p><p className="mt-1 text-[11px] leading-snug text-brand-100">{text}</p></div>
    <button onClick={onOpen} className="btn-primary shrink-0 !bg-accent hover:!bg-amber-600"><FlaskConical size={14} />Ir a Experimenta</button></div>
);

/** Formulación (TSD 1): 4 preguntas con desbloqueo gradual y hasta 3 devoluciones didácticas por pregunta. */
export function FormulationPanel({ correctLanes, answers, states, onAnswer, onFlush, onRequest, onOpenQuestion, onOpenTesting }: {
  correctLanes: number; answers: FormulationAnswers; states: Record<number, FormulationQuestionState>; onAnswer: (qId: number, text: string) => void; onFlush: () => void;
  onRequest: (qId: number) => void; onOpenQuestion: (qId: number) => void; onOpenTesting: () => void;
}) {
  const [active, setActive] = useState(1);
  const has = (k: keyof FormulationAnswers) => (answers[k] ?? '').trim().length > 0;
  const unlocked = (id: number) => (id === 1 ? correctLanes >= 5 : id === 2 ? correctLanes >= 10 : id === 3 ? has('q2') : has('q3'));
  const q = FORMULATION_QUESTIONS.find((x) => x.id === active)!;
  const st = states[active] ?? { id: active, answer: '', devolutionLevel: 0, revisionsCount: 0 };
  const key = `q${active}` as keyof FormulationAnswers;
  return (
    <div className="space-y-4" data-testid="formulation-panel">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3"><div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white"><Brain size={20} /><span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-bl-md bg-accent" /></div>
          <div><p className="micro">Situaciones de formulación · TSD 1</p><h3 className="text-base text-slate-900">Panel de Formulación y Reflexión</h3></div></div>
        <p className="micro hidden sm:block">{correctLanes} / 10 escalones completados</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{FORMULATION_QUESTIONS.map((x) => {
        const u = unlocked(x.id); const done = has(`q${x.id}` as keyof FormulationAnswers); const on = x.id === active;
        return (<button key={x.id} disabled={!u} data-testid={`q-tab-${x.id}`} onClick={() => { setActive(x.id); onOpenQuestion(x.id); }}
          className={`rounded-xl border p-3 text-left transition ${on ? 'border-brand-500 bg-brand-500 text-white' : u ? (done ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400' : 'border-slate-200 bg-white hover:bg-slate-100') : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'}`}>
          <span className="flex items-center justify-between"><span className={`micro ${on ? '!text-brand-100' : ''}`}>P{x.id}</span>{!u ? <Lock size={12} /> : done ? <CheckCircle2 size={14} className={on ? 'text-emerald-300' : 'text-emerald-600'} /> : null}</span>
          <span className="mt-1 block text-xs">{x.title}</span></button>);
      })}</div>
      {!unlocked(active) ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center"><Lock className="mx-auto mb-2 text-slate-400" /><h4 className="text-sm text-slate-900">Pregunta {active} bloqueada</h4><p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{q.unlockConditionText}</p></div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4"><p className="micro mb-1 flex items-center gap-1.5 !text-brand-500"><MessageSquare size={12} />{q.subhead}</p><p className="text-sm leading-relaxed text-slate-900">{q.enunciado}</p></div>
          <div><div className="mb-1 flex items-center justify-between"><label className="label !mb-0" htmlFor="ans">Tu respuesta escrita</label><span className="micro !normal-case !tracking-normal italic">Sin marca de correcto / incorrecto</span></div>
            <textarea id="ans" data-testid="answer-input" value={answers[key] ?? ''} onChange={(e) => onAnswer(active, e.target.value)} onBlur={onFlush} placeholder="Escribe tus observaciones y descubrimientos con tus palabras…" className="input h-28 resize-none text-xs leading-relaxed" /></div>
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between"><h4 className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-900"><HelpCircle size={15} className="text-brand-500" />Devoluciones didácticas ({st.devolutionLevel}/3)</h4>
              {st.devolutionLevel < 3 && <button data-testid="btn-devolution" className="btn-ghost !py-1.5" onClick={() => onRequest(active)}>Solicitar devolución<ChevronRight size={13} /></button>}</div>
            {st.devolutionLevel === 0 ? <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] italic text-slate-500">Si necesitas orientación sobre qué observar, solicita una devolución.</p> : <Devolutions items={q.devoluciones} level={st.devolutionLevel} />}
            {st.devolutionLevel === 3 && <Exhausted onOpen={onOpenTesting} text="Si agotaste las devoluciones, te invitamos a experimentar en el área de pruebas para comprobar tus ideas." />}
          </div>
        </div>)}
    </div>
  );
}

/** Anclaje (TSD 2 y TSD 3): pregunta puente con hasta 3 devoluciones. */
export function AnchorPanel({ activity, answers, anchor, onAnswer, onFlush, onRequest, onGoToTSD1, onOpenTesting }: {
  activity: 'TSD2' | 'TSD3'; answers: FormulationAnswers; anchor: AnchorState; onAnswer: (a: 'TSD2' | 'TSD3', t: string) => void; onFlush: () => void;
  onRequest: (a: 'TSD2' | 'TSD3') => void; onGoToTSD1: () => void; onOpenTesting: () => void;
}) {
  const c = ANCHOR_CONFIGS[activity]; const key = activity === 'TSD2' ? 'tsd2Bridge' : 'tsd3Bridge';
  const q3 = answers.q3?.trim() ?? ''; const q4 = answers.q4?.trim() ?? ''; const has = q3.length > 0 || q4.length > 0;
  return (
    <div className="space-y-4" data-testid="anchor-panel">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3"><div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white"><Bookmark size={19} /><span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-bl-md bg-accent" /></div>
          <div><p className="micro">Anclaje conceptual y devolución didáctica</p><h3 className="text-base text-slate-900">{c.title}</h3><p className="text-[11px] text-brand-400">{c.subhead}</p></div></div>
        <span className="pill hidden border-brand-100 bg-brand-50 text-[10px] uppercase tracking-wider text-brand-500 sm:inline-flex">{c.meta}</span>
      </div>
      <div className="space-y-2"><div className="flex items-center justify-between"><span className="micro">Antecedentes construidos en TSD 1 (El Volantín)</span>{has && <span className="flex items-center gap-1 text-[10px] text-emerald-600"><CheckCircle2 size={12} />Registrado</span>}</div>
        {!has ? (<div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 sm:flex-row"><p className="text-xs text-amber-900">Aún no has completado las preguntas de formulación en TSD 1. Te sugerimos revisarlas para fundamentar tus respuestas en esta etapa.</p><button className="btn-ghost shrink-0" onClick={onGoToTSD1}><ArrowLeft size={13} />Ir a TSD 1</button></div>)
          : (<div className="grid gap-3 md:grid-cols-2">{([['Pregunta 3 (nombres y medidas descubiertas)', q3], ['Pregunta 4 (relación entre escalones sucesivos)', q4]] as const).map(([t, v]) => (
            <div key={t} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="micro !text-brand-500">{t}</p><p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-xs italic text-slate-700">{v || '(Sin respuesta registrada)'}</p></div>))}</div>)}</div>
      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4"><p className="micro mb-1 flex items-center gap-1.5 !text-brand-500"><MessageSquare size={12} />Desafío de reflexión y formulación ({activity})</p><p className="text-sm leading-relaxed text-slate-900">{c.enunciado}</p></div>
      <div><div className="mb-1 flex items-center justify-between"><label className="label !mb-0" htmlFor="bridge">Tu explicación y descubrimientos</label><span className="micro !normal-case !tracking-normal italic">Registro semiótico autónomo</span></div>
        <textarea id="bridge" data-testid="bridge-input" value={answers[key] ?? ''} onChange={(e) => onAnswer(activity, e.target.value)} onBlur={onFlush} placeholder={c.placeholder} className="input h-32 resize-none text-xs leading-relaxed" /></div>
      <div className="space-y-3 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between"><h4 className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-900"><HelpCircle size={15} className="text-brand-500" />Devoluciones didácticas ({anchor.devolutionLevel}/3)</h4>
          {anchor.devolutionLevel < 3 && <button data-testid="btn-anchor-devolution" className="btn-ghost !py-1.5" onClick={() => onRequest(activity)}>Solicitar devolución<ChevronRight size={13} /></button>}</div>
        {anchor.devolutionLevel === 0 ? <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] italic text-slate-500">Si necesitas pistas para orientar tu análisis sobre la descomposición, solicita una devolución didáctica.</p> : <Devolutions items={c.devoluciones} level={anchor.devolutionLevel} />}
        {anchor.devolutionLevel === 3 && <Exhausted onOpen={onOpenTesting} text="Consultaste todas las pistas. Comprueba tus hipótesis manipulando las regletas en el área de pruebas." />}
      </div>
    </div>
  );
}
