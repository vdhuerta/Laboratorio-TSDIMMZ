import { ArrowLeft, CheckCircle2, Lightbulb, Target } from 'lucide-react';
import { PHASES_CONFIG, PHASE_TONES, TSDPhase, type Card } from '../data/cards';
import AppHeader from '../components/AppHeader';

export default function SolutionView({ onBack, cards }: { onBack: () => void; cards: Card[] }) {
  const phases = Object.values(TSDPhase);
  return (
    <div className="flex min-h-screen flex-col bg-chrome-bg">
      <AppHeader left={<button onClick={onBack} className="btn-ghost !px-3 !py-1.5"><ArrowLeft size={14} />Volver</button>}><span className="pill border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 size={12} className="mr-1" />Solución correcta</span></AppHeader>
      <main className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <section className="card flex items-start gap-4 p-5"><span className="rounded-xl bg-accent-soft p-3 text-accent"><Lightbulb size={20} /></span><div><h2 className="text-lg text-slate-900">Guía didáctica</h2><p className="mt-1 text-sm text-slate-600">Distribución correcta de las tarjetas según la Teoría de las Situaciones Didácticas de Guy Brousseau. Cada fase cumple un propósito específico en el proceso de aprendizaje y las tarjetas están organizadas para preservar el carácter adidáctico de la situación.</p></div></section>
        <div className="grid gap-5 md:grid-cols-2">
          {phases.map((p) => { const cfg = PHASES_CONFIG[p]; const t = PHASE_TONES[cfg.tone];
            return (<section key={p} className={`card p-5 ${t.soft}`}>
              <header className="mb-1 flex items-center gap-3"><i className={`h-3 w-3 rounded-full ${t.dot}`} /><h3 className={`text-lg ${t.text}`}>{cfg.title}</h3></header>
              <p className="micro mb-4 border-b border-slate-200 pb-3 !normal-case !tracking-normal">{cfg.description}</p>
              <div className="space-y-3">{cards.filter((c) => c.correctPhase === p).map((c) => (
                <div key={c.id} className="card p-4"><div className="mb-2 flex items-center gap-2 text-rose-600"><Target size={14} /><span className="text-[10px] uppercase tracking-widest">{c.type}</span></div>
                  <p className="mb-3 text-sm text-slate-900">{c.content}</p>
                  <div className="rounded-lg bg-accent-soft p-3"><span className="micro !text-amber-700">Justificación</span><p className="mt-1 text-[11px] text-slate-600">{c.justification}</p></div></div>))}</div></section>); })}
        </div>
      </main>
    </div>
  );
}
