import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Activity, BarChart3, ClipboardList, Eye, EyeOff, HelpCircle, RotateCcw, Settings } from 'lucide-react';
import { APP_META, APP_VERSION, BUILD_DATE, INSTITUTION } from './config';
import { getForma, PHASES_CONFIG, PHASE_TONES, TSDPhase, type Card, type Forma } from './data/cards';
import { devolutionPct, type Board, type HistoryEvent } from './lib/metrics';
import { freshBoard, storage } from './lib/storage';
import AppHeader from './components/AppHeader';
import { AvailableDeck, DraggableCard, DropZone } from './components/Board';
import { AnalysisModal, ConfigModal, ConfirmModal, ConjectureModal, HelpModal } from './components/Modals';
import AnalysisView from './views/AnalysisView';
import SolutionView from './views/SolutionView';

const PHASES = [TSDPhase.ACTION, TSDPhase.FORMULATION, TSDPhase.VALIDATION, TSDPhase.INSTITUTIONALIZATION];

export default function App() {
  const [formaId, setFormaId] = useState<Forma['id']>(() => storage.formaId());
  const forma = useMemo(() => getForma(formaId), [formaId]);
  const [board, setBoard] = useState<Board>(() => storage.board(getForma(storage.formaId()).cards));
  const [analyzed, setAnalyzed] = useState<string[]>(() => storage.analyzed());
  const [history, setHistory] = useState<HistoryEvent[]>(() => storage.history());
  const [name, setName] = useState(() => storage.name());
  const [classNumber, setClassNumber] = useState<number | null>(() => storage.classNumber(APP_META.defaultClassNumber));
  const [view, setView] = useState<'sim' | 'analysis'>('sim');
  const [verifying, setVerifying] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startContainer, setStartContainer] = useState<string | null>(null);
  const [analysisCard, setAnalysisCard] = useState<Card | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [judgmentEnabled, setJudgmentEnabled] = useState(() => storage.judgmentEnabled());
  const [pendingJudgment, setPendingJudgment] = useState<{ card: Card; real: boolean } | null>(null);

  useEffect(() => storage.saveBoard(board), [board]);
  useEffect(() => storage.saveAnalyzed(analyzed), [analyzed]);
  useEffect(() => storage.saveHistory(history), [history]);
  useEffect(() => storage.saveName(name), [name]);
  useEffect(() => storage.saveClassNumber(classNumber), [classNumber]);
  useEffect(() => storage.saveJudgmentEnabled(judgmentEnabled), [judgmentEnabled]);
  useEffect(() => storage.saveFormaId(formaId), [formaId]);

  const devolution = useMemo(() => devolutionPct(board, analyzed.length), [board, analyzed]);
  const assigned = forma.cards.length - board.available.length;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const activeCard = useMemo(() => (activeId ? (Object.values(board).flat() as Card[]).find((c) => c.id === activeId) ?? null : null), [activeId, board]);

  const findContainer = (id: string) => (id in board ? id : Object.keys(board).find((k) => board[k].some((c) => c.id === id)));

  const onDragStart = (e: DragStartEvent) => { setStartContainer(findContainer(String(e.active.id)) ?? null); setActiveId(String(e.active.id)); };
  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e; if (!over) return;
    const from = findContainer(String(active.id)), to = findContainer(String(over.id));
    if (!from || !to || from === to) return;
    setBoard((prev) => {
      const card = prev[from].find((c) => c.id === active.id); if (!card) return prev;
      const overItems = prev[to]; const overIndex = overItems.findIndex((c) => c.id === over.id);
      const newIndex = over.id in prev ? overItems.length : overIndex >= 0 ? overIndex + (overIndex === overItems.length - 1 ? 1 : 0) : overItems.length;
      return { ...prev, [from]: prev[from].filter((c) => c.id !== active.id), [to]: [...prev[to].slice(0, newIndex), card, ...prev[to].slice(newIndex)] };
    });
  };
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e; const end = findContainer(String(active.id));
    if (startContainer && end && startContainer !== end) {
      const card = forma.cards.find((c) => c.id === active.id);
      // Solo se registra una traza cuando la tarjeta cae en una fase TSD (igual que el original).
      if (end !== 'available' && card) {
        const isCorrect = end === card.correctPhase;
        setHistory((h) => [...h, { type: 'move', cardId: card.id, cardContent: card.content, from: startContainer, to: end, isCorrect, timestamp: Date.now() }]);
        // El movimiento ya quedó registrado; el juicio (IM11) es aparte y opcional.
        if (judgmentEnabled) setPendingJudgment({ card, real: isCorrect });
      }
    } else if (startContainer && end && over?.id && active.id !== over.id) {
      const oc = findContainer(String(over.id));
      if (oc) setBoard((p) => ({ ...p, [oc]: arrayMove(p[oc], p[oc].findIndex((c) => c.id === active.id), p[oc].findIndex((c) => c.id === over.id)) }));
    }
    setActiveId(null); setStartContainer(null);
  };

  const onAnalysis = (card: Card) => {
    const c = findContainer(card.id);
    if (c && c !== 'available') { setAnalysisCard(card); setAnalyzed((a) => (a.includes(card.id) ? a : [...a, card.id])); setHistory((h) => [...h, { type: 'analysis', cardId: card.id, cardContent: card.content, timestamp: Date.now() }]); }
  };
  const answerJudgment = (declared: boolean) => {
    if (!pendingJudgment) return;
    setHistory((h) => [...h, { type: 'judgment', cardId: pendingJudgment.card.id, declared, real: pendingJudgment.real, timestamp: Date.now() }]);
    setPendingJudgment(null);
  };

  const feedback = (card: Card) => findContainer(card.id) === card.correctPhase
    ? { ok: true, title: 'Retroalimentación del milieu', text: `El estudiante interactúa con el milieu y recibe una respuesta que confirma su estrategia. ${card.justification?.split('.')[0]}. Esto fortalece el contrato didáctico de búsqueda autónoma.` }
    : { ok: false, title: 'Devolución didáctica (obstáculo)', text: card.devolutionFeedback || 'En esta fase, la acción del sujeto no se corresponde con la naturaleza del milieu propuesto. ¿Es el docente quien debe validar o es el estudiante quien debe descubrir la contradicción? Revisa si el protagonismo del saber está en manos del alumno.' };

  const reset = () => { setBoard(freshBoard(forma.cards)); setAnalyzed([]); setHistory([]); setVerifying(false); setPendingJudgment(null); storage.clearSession(); };
  // Cambiar de forma cambia el mazo de tarjetas: la sesión en curso (tablero, historial, análisis)
  // ya no tiene sentido con otro contenido, así que se reinicia igual que con «Reiniciar».
  const changeForma = (id: Forma['id']) => { setFormaId(id); setBoard(freshBoard(getForma(id).cards)); setAnalyzed([]); setHistory([]); setVerifying(false); setPendingJudgment(null); storage.clearSession(); };

  if (showSolution) return <SolutionView onBack={() => setShowSolution(false)} cards={forma.cards} />;

  const tabBtn = (k: 'sim' | 'analysis', label: string, icon: React.ReactNode) => (
    <button onClick={() => setView(k)} data-testid={`tab-${k}`} role="tab" aria-selected={view === k} className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] transition ${view === k ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{icon}{label}</button>);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-chrome-bg">
      <ConfigModal open={showConfig} onClose={() => setShowConfig(false)} onShowSolution={() => setShowSolution(true)} classNumber={classNumber} onClass={setClassNumber} formaId={formaId} onForma={changeForma} judgmentEnabled={judgmentEnabled} onJudgmentEnabled={setJudgmentEnabled} />
      <AnalysisModal card={analysisCard} open={analysisCard !== null} onClose={() => setAnalysisCard(null)} feedback={analysisCard ? feedback(analysisCard) : null} />
      <ConfirmModal open={showReset} onClose={() => setShowReset(false)} onConfirm={reset} />
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} scenario={forma.nombre} />
      <ConjectureModal card={pendingJudgment?.card ?? null} open={pendingJudgment !== null} onAnswer={answerJudgment} onClose={() => setPendingJudgment(null)} />

      <AppHeader scenario={forma.nombre}>
        <div className="hidden gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs md:flex" role="tablist">{tabBtn('sim', 'Simulador', <ClipboardList size={13} />)}{tabBtn('analysis', 'Análisis del participante', <Activity size={13} />)}</div>
        <button onClick={() => setVerifying((v) => !v)} disabled={assigned === 0} data-testid="btn-verify-eye" aria-pressed={verifying} className={`btn-ghost !px-2.5 ${verifying ? '!border-brand-200 !bg-brand-50 !text-brand-500' : ''}`} title={verifying ? 'Ocultar verificación de diseño' : 'Verificar diseño'} aria-label={verifying ? 'Ocultar verificación de diseño' : 'Verificar diseño'}>{verifying ? <Eye size={15} /> : <EyeOff size={15} />}</button>
        <button onClick={() => setShowHelp(true)} className="btn-ghost !px-2.5" title="Ayuda" aria-label="Ayuda"><HelpCircle size={15} /></button>
        <button onClick={() => setShowConfig(true)} className="btn-ghost !px-2.5" title="Configuración" aria-label="Configuración"><Settings size={15} /></button>
        <button onClick={() => setShowReset(true)} className="btn-ghost !px-2.5 hover:!bg-rose-50 hover:!text-rose-600" title="Reiniciar" aria-label="Reiniciar"><RotateCcw size={15} /></button>
      </AppHeader>
      <div className="flex gap-1 border-b border-slate-200 bg-white p-2 md:hidden" role="tablist">{tabBtn('sim', 'Simulador', <ClipboardList size={13} />)}{tabBtn('analysis', 'Análisis', <Activity size={13} />)}</div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {view === 'analysis' ? (
          <div className="flex-1 overflow-y-auto"><AnalysisView history={history} board={board} classNumber={classNumber} name={name} onName={setName} onClear={() => setHistory([])} judgmentEnabled={judgmentEnabled} forma={forma} /></div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <main className="flex flex-1 flex-col overflow-hidden md:flex-row">
              <aside className="flex max-h-[42vh] w-full shrink-0 flex-col border-b border-slate-200 bg-chrome-bg p-4 md:max-h-none md:w-72 md:border-b-0 md:border-r lg:w-80 lg:p-5">
                <p className="micro mb-3">Estadísticas</p>
                <div className="mb-4 space-y-3">
                  <div className="card p-3"><div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-wider"><span className="text-slate-500">Devolución</span><span className="text-brand-500 font-title" data-testid="devolution">{devolution}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-brand-500 transition-all" style={{ width: `${devolution}%` }} /></div></div>
                  <div className="card p-3"><div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-wider"><span className="text-slate-500">Diseño completado</span><span className="text-brand-500 font-title">{Math.round((assigned / forma.cards.length) * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-accent transition-all" style={{ width: `${(assigned / forma.cards.length) * 100}%` }} /></div></div>
                </div>
                <div className="mb-2 flex items-center justify-between"><p className="micro text-sm !text-brand-500 font-title !tracking-widest">Mazo de tarjetas</p><span className="pill border-rose-200 bg-rose-50 !py-0 text-rose-600" data-testid="remaining">{board.available.length}</span></div>
                <AvailableDeck cards={board.available} showSolutions={false} />
              </aside>

              <section className="flex-1 space-y-5 overflow-y-auto p-4 lg:p-6">
                <div>
                  <span className="pill border-brand-100 bg-brand-50 text-[10px] uppercase tracking-widest text-brand-500">Desafío actual · Forma {forma.id}</span>
                  <h2 className="mt-2 text-3xl text-slate-900">{forma.nombre}</h2>
                  <p className="mt-2 max-w-4xl text-sm text-slate-600">{forma.descripcion}</p>
                  <div className="mt-3 flex flex-wrap gap-2">{forma.elementos.map(([n, p, e]) => <span key={n} className="pill gap-1.5 !px-3 !py-1 text-[11px] text-slate-700"><span className="text-base">{e}</span>{n}: {p}</span>)}</div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 pb-2">
                  {PHASES.map((p) => <DropZone key={p} id={p} cards={board[p]} verifying={verifying} showSolutions={false} onAnalysis={onAnalysis} />)}
                </div>
                <div className="card flex flex-col items-center border-dashed p-6 text-center"><BarChart3 className="mb-2 text-brand-500" /><h3 className="text-xs uppercase tracking-widest text-slate-900">Reflexión didáctica</h3><p className="micro mt-1 max-w-sm">Has realizado un <span className="text-brand-500">{devolution}%</span> de devolución didáctica. Continúa analizando tus decisiones para profundizar en la teoría de Brousseau. Cuando termines, ve a «Análisis del participante» y descarga tu reporte.</p><button className="btn-ghost mt-3" onClick={() => setView('analysis')}><Activity size={14} />Ver mi análisis</button></div>
              </section>

              <aside className="hidden w-72 shrink-0 flex-col gap-6 overflow-y-auto border-l border-slate-200 bg-chrome-bg p-5 xl:flex">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2"><ClipboardList size={16} className="text-brand-500" /><h3 className="text-xs uppercase tracking-widest text-slate-900">Hoja de ruta</h3></div>
                <nav className="space-y-5">{PHASES.map((p, i) => { const cfg = PHASES_CONFIG[p]; const t = PHASE_TONES[cfg.tone]; const done = board[p].length > 0; return (
                  <div key={p} className={`relative pl-8 ${done ? '' : 'opacity-50'}`}><div className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-title ${done ? 'bg-brand-500 text-white' : 'border border-slate-300 bg-white text-slate-400'}`}>{i + 1}</div>
                    {i < 3 && <div className="absolute left-3 top-7 h-9 w-px bg-slate-200" />}<h4 className={`mb-0.5 text-xs ${t.text}`}>{cfg.title}</h4><p className="text-[10px] leading-relaxed text-slate-500">{cfg.description.split('.')[0]}.</p></div>); })}</nav>
                <div className="mt-auto rounded-xl border border-slate-200 bg-white p-4"><p className="micro mb-1">Base teórica</p><p className="text-[11px] italic text-slate-600">«El profesor desaparece como juez del saber para convertirse en el organizador del milieu.» — Brousseau</p></div>
              </aside>
              <DragOverlay dropAnimation={null}>{activeCard ? <DraggableCard card={activeCard} isOverlay /> : null}</DragOverlay>
            </main>
          </DndContext>
        )}
      </div>
      <footer className="flex h-7 shrink-0 items-center justify-center border-t border-slate-200 bg-white px-4"><p className="text-[10px] uppercase tracking-widest text-slate-400">{APP_META.name} © 2026 · {INSTITUTION} · v{APP_VERSION} · {BUILD_DATE}</p></footer>
    </div>
  );
}
