import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin, rectIntersection, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Activity, Bookmark, Brain, ClipboardList, Eye, EyeOff, FlaskConical, HelpCircle, Lightbulb, Lock, RotateCcw, Send, Settings, BookOpen } from 'lucide-react';
import { APP_META, APP_VERSION, BUILD_DATE, INSTITUTION } from './config';
import { ACTIVITIES, ACTIVITY_META, LANE_COUNT, ROD_CONFIG, TSD3_TOTAL, isLaneCorrect, realTarget, rodOf, visualCapacity } from './data/lab';
import type { ActivityKey, EventType, LabEvent, Snapshot, TestAreaPiece } from './labTypes';
import { activityComplete, correctLanes, devolutionPct, stageProgress, substantive } from './lib/metrics';
import { emptyAnchors, emptyAnswers, emptyFormulation, emptyLanes, freshSession, storage } from './lib/storage';
import AppHeader from './components/AppHeader';
import { AnchorPanel, ConstructionDevolution, FormulationPanel } from './components/Panels';
import { DepositRod, RodBar, TestingArea } from './components/Rods';
import Scene from './components/Scenes';
import { laneLabel } from './lib/immzReport';
import { DEV_TEXT, devLevels } from './data/devolutions';
import { diagnoseSituation } from './lib/situation';
import { ConfigModal, ConfirmModal, GuideModal, InstructionsModal, IntroModal, LockModal, MessageModal, type LockInfo } from './components/Modals';
import { Modal, Tip } from './components/ui';
import AnalysisView from './views/AnalysisView';

type AnswerKey = 'q1' | 'q2' | 'q3' | 'q4' | 'tsd2Bridge' | 'tsd3Bridge';
/** Orden aleatorio del depósito: nunca ascendente, descendente ni casi ordenado (evita el efecto Topaze en la escalera). */
function shuffledRods(): number[] {
  const base = ROD_CONFIG.map((r) => r.length);
  for (let n = 0; n < 200; n++) {
    const a = [...base]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const steps = a.slice(1).filter((v, i) => Math.abs(v - a[i]) === 1).length;
    if (steps <= 2 && a[0] !== 1 && a[0] !== 10) return a;
  }
  return [4, 9, 2, 7, 10, 1, 6, 3, 8, 5];
}
const uid = () => Math.random().toString(36).slice(2, 11);
let seq = 0;

const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  const test = within.find((c) => c.id === 'testing-area');
  if (test) return [test];
  return within.length ? within : rectIntersection(args);
};

export default function App() {
  const init = useMemo(() => storage.session(), []);
  const [activeActivity, setActive] = useState<ActivityKey>(init.activeActivity);
  const [showIntro, setShowIntro] = useState(init.showIntro);
  const [targetUnits, setTargetUnits] = useState(init.targetUnits);
  const [inventoryCount, setInventoryCount] = useState(init.inventoryCount);
  const [lanes, setLanes] = useState(init.lanes);
  const [testArea, setTestArea] = useState(init.testArea);
  const [answers, setAnswers] = useState(init.answers);
  const [formulationStates, setFormulationStates] = useState(init.formulationStates);
  const [anchorStates, setAnchorStates] = useState(init.anchorStates);
  const [history, setHistory] = useState<LabEvent[]>(init.history);
  const [name, setName] = useState(() => storage.name());
  const [classNumber, setClassNumber] = useState<number | null>(() => storage.classNumber(APP_META.defaultClassNumber));

  const [view, setView] = useState<'lab' | 'analysis'>('lab');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showTesting, setShowTesting] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showFormulation, setShowFormulation] = useState(false);
  const [showAnchor, setShowAnchor] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [order, setOrder] = useState<number[]>(() => shuffledRods());
  const [confirm, setConfirm] = useState<'all' | null>(null);
  const [lock, setLock] = useState<LockInfo | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [showNumbers, setShowNumbers] = useState(false);
  const [showCounter, setShowCounter] = useState(false);

  const cfg = useMemo(() => ({ targetUnits }), [targetUnits]);
  const snap: Snapshot = useMemo(() => ({ history, lanes, answers, formulationStates, anchorStates, config: cfg }), [history, lanes, answers, formulationStates, anchorStates, cfg]);
  const act = activeActivity;
  const actLanes = lanes[act];
  const pieces = testArea[act];
  const complete = activityComplete(snap, act);
  /* Etapa terminada: pulso verde permanente en «Instrucciones» y, dentro, en «Mirada didáctica» (no se apaga al abrirla) */
  const prompt = complete;
  const didacticOpenedAt = useRef<number | null>(null);
  const openInstructions = () => { setShowInstructions(true); log('instructions_open', act, { payload: { complete, prompted: prompt } }); };

  /* ───────── persistencia ───────── */
  useEffect(() => { storage.saveSession({ activeActivity, showIntro, targetUnits, inventoryCount, lanes, testArea, answers, formulationStates, anchorStates, history }); },
    [activeActivity, showIntro, targetUnits, inventoryCount, lanes, testArea, answers, formulationStates, anchorStates, history]);
  useEffect(() => storage.saveName(name), [name]);
  useEffect(() => storage.saveClassNumber(classNumber), [classNumber]);

  /* ───────── traza de eventos ───────── */
  const log = (type: EventType, activity: ActivityKey, extra: Partial<LabEvent> = {}) =>
    setHistory((h) => [...h, { id: `e${Date.now().toString(36)}${String(seq++).padStart(6, '0')}`, timestamp: Date.now(), activity, type, ...extra }]);

  /* ───────── inventario (derivado: nunca se desincroniza) ───────── */
  const inventory = useMemo(() => {
    const used: Record<number, number> = {};
    actLanes.forEach((l) => l.forEach((r) => { used[r.length] = (used[r.length] ?? 0) + 1; }));
    pieces.forEach((p) => { used[p.length] = (used[p.length] ?? 0) + 1; });
    const inv: Record<number, number> = {};
    ROD_CONFIG.forEach((r) => { inv[r.length] = Math.max(0, inventoryCount - (used[r.length] ?? 0)); });
    return inv;
  }, [actLanes, pieces, inventoryCount]);

  /* ───────── actividad completada ───────── */
  const completedRef = useRef(new Set<ActivityKey>(ACTIVITIES.filter((a) => init.history.some((e) => e.type === 'activity_complete' && e.activity === a))));
  useEffect(() => {
    ACTIVITIES.forEach((a) => {
      if (activityComplete(snap, a) && !completedRef.current.has(a)) {
        completedRef.current.add(a); log('activity_complete', a);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, targetUnits]);

  /* ───────── colocar y quitar regletas ───────── */
  const place = (idx: number, length: number, fromTestId?: string): boolean => {
    const lane = actLanes[idx] ?? []; const sum = lane.reduce((s, r) => s + r.length, 0);
    if (!fromTestId && (inventory[length] ?? 0) <= 0) return false;
    if (act === 'TSD3' && lane.length >= 10) return false;
    const cap = visualCapacity(act, idx, cfg), target = realTarget(act, idx, cfg);
    const isOverflow = sum + length > target, rejected = sum + length > cap;
    const base = { laneIndex: idx, rodLength: length };
    if (rejected) { log('place', act, { ...base, payload: { fits: false, isOverflow: true, isWrong: false, rejected: true, sumBefore: sum, target } }); return false; }
    const rod = { id: uid(), length, color: rodOf(length)!.color, code: rodOf(length)!.code };
    const newLens = [...lane.map((r) => r.length), length];
    const isWrong = act === 'TSD3' && sum + length >= TSD3_TOTAL && !isLaneCorrect(act, idx, newLens, cfg);
    setLanes((p) => ({ ...p, [act]: p[act].map((l, i) => (i === idx ? [...l, rod] : l)) }));
    log('place', act, { ...base, payload: { fits: !isOverflow, isOverflow, isWrong, rejected: false, sumBefore: sum, target } });
    if (isLaneCorrect(act, idx, newLens, cfg)) log('validation_success', act, { laneIndex: idx });
    return true;
  };
  const removeRod = (idx: number, rodId: string, length: number) => {
    const lane = actLanes[idx] ?? []; const lens = lane.map((r) => r.length); const sum = lens.reduce((s, l) => s + l, 0);
    const wasIncorrect = sum > realTarget(act, idx, cfg) || !isLaneCorrect(act, idx, lens, cfg);
    const i = lens.indexOf(length); const after = lane.filter((r) => r.id !== rodId).map((r) => r.length);
    setLanes((p) => ({ ...p, [act]: p[act].map((l, k) => (k === idx ? l.filter((r) => r.id !== rodId) : l)) }));
    log('remove', act, { laneIndex: idx, rodLength: length, payload: { wasIncorrect, sumBefore: sum } });
    if (i >= 0 && !isLaneCorrect(act, idx, lens, cfg) && isLaneCorrect(act, idx, after, cfg)) log('validation_success', act, { laneIndex: idx });
  };

  /* ───────── Experimenta ───────── */
  const addTestPiece = (length: number, x: number, y: number) => {
    if ((inventory[length] ?? 0) <= 0) return;
    const r = rodOf(length)!; const piece: TestAreaPiece = { id: uid(), length, color: r.color, code: r.code, x: Math.max(4, x), y: Math.max(4, y) };
    setTestArea((p) => ({ ...p, [act]: [...p[act], piece] }));
    log('test_area_use', act, { rodLength: length });
  };
  const removeTestPiece = (id: string) => setTestArea((p) => ({ ...p, [act]: p[act].filter((x) => x.id !== id) }));
  const toggleTesting = (open: boolean) => { setShowTesting(open); log('test_area_open', act, { payload: { open } }); };

  /* ───────── arrastre ───────── */
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));
  const onDragStart = (e: DragStartEvent) => { const d = e.active.data.current as { length?: number } | undefined; setDragging(d?.length ?? null); };
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const { over, active, delta } = e; const idStr = String(active.id); const isTest = idStr.startsWith('test-piece-');
    const d = active.data.current as { length?: number; piece?: TestAreaPiece } | undefined; const length = d?.length;
    if (over && String(over.id).startsWith('lane-') && length) {
      const ok = place(Number(String(over.id).slice(5)), length, isTest ? idStr.slice(11) : undefined);
      if (ok && isTest) removeTestPiece(idStr.slice(11));
    } else if (over?.id === 'testing-area') {
      if (isTest && d?.piece) {
        const pid = d.piece.id;
        setTestArea((p) => ({ ...p, [act]: [...p[act].filter((x) => x.id !== pid), { ...d.piece!, x: Math.max(0, d.piece!.x + delta.x), y: Math.max(0, d.piece!.y + delta.y) }] }));
      } else if (length) {
        const tr = active.rect.current.translated; addTestPiece(length, tr ? tr.left - over.rect.left : 12, tr ? tr.top - over.rect.top : 12);
      }
    } else if (isTest) removeTestPiece(idStr.slice(11));
  };
  const placeSelected = (idx: number) => { if (selected === null) return; const ok = place(idx, selected); if (ok && (inventory[selected] ?? 0) <= 1) setSelected(null); };
  const dropSelectedInTesting = () => { if (selected) { addTestPiece(selected, 16 + pieces.length * 22, 16 + (pieces.length % 4) * 40); if ((inventory[selected] ?? 0) <= 1) setSelected(null); } };

  /* ───────── respuestas escritas (registro con pausa de 1,2 s) ───────── */
  const answersRef = useRef<Record<AnswerKey, string>>({ ...init.answers });
  const lastLogged = useRef<Record<string, string>>({ ...init.answers });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const flushKey = (key: AnswerKey) => {
    if (timers.current[key]) { clearTimeout(timers.current[key]); delete timers.current[key]; }
    const text = answersRef.current[key] ?? ''; const prev = lastLogged.current[key] ?? '';
    if (text === prev) return;
    const bridge = key === 'tsd2Bridge' || key === 'tsd3Bridge';
    const a: ActivityKey = key === 'tsd2Bridge' ? 'TSD2' : key === 'tsd3Bridge' ? 'TSD3' : 'TSD1';
    const qid = bridge ? undefined : Number(key.slice(1)); const revision = prev.trim().length > 0;
    log('question_answer', a, { questionId: qid, payload: { bridge, empty: text.trim() === '', chars: text.trim().length, isRevision: revision } });
    if (revision) log('answer_revision', a, { questionId: qid, payload: { bridge } });
    lastLogged.current[key] = text;
    if (bridge) setAnchorStates((p) => ({ ...p, [a]: { ...p[a as 'TSD2' | 'TSD3'], revisionsCount: p[a as 'TSD2' | 'TSD3'].revisionsCount + (revision ? 1 : 0) } }));
    else setFormulationStates((p) => ({ ...p, [qid!]: { ...p[qid!], answer: text, revisionsCount: p[qid!].revisionsCount + (revision ? 1 : 0) } }));
  };
  const flushAll = () => (Object.keys(timers.current) as AnswerKey[]).forEach(flushKey);
  const setAnswer = (key: AnswerKey, text: string) => {
    answersRef.current = { ...answersRef.current, [key]: text };
    setAnswers((p) => ({ ...p, [key]: text }));
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => flushKey(key), 1200);
  };
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  /* ───────── formulación y anclajes ───────── */
  const requestFormulation = (qid: number) => {
    const lv = Math.min(3, (formulationStates[qid]?.devolutionLevel ?? 0) + 1); if (lv === (formulationStates[qid]?.devolutionLevel ?? 0)) return;
    setFormulationStates((p) => ({ ...p, [qid]: { ...p[qid], devolutionLevel: lv } }));
    log('devolution_request', 'TSD1', { questionId: qid, devolutionLevel: lv }); 
  };
  const requestAnchor = (a: 'TSD2' | 'TSD3') => {
    const lv = Math.min(3, anchorStates[a].devolutionLevel + 1); if (lv === anchorStates[a].devolutionLevel) return;
    setAnchorStates((p) => ({ ...p, [a]: { ...p[a], devolutionLevel: lv, lastUnlockedAt: Date.now() } }));
    log('devolution_request', a, { devolutionLevel: lv, payload: { anchor: true, target: 'anchor_panel' } });
  };
  /* devolución didáctica de la construcción (TSD 1, 2 y 3) */
  const situation = useMemo(() => diagnoseSituation(snap, act), [snap, act]);
  const devLv = devLevels(history)[situation.key] ?? 0;
  const requestConstruction = () => {
    const sit = diagnoseSituation(snap, act); const lv = Math.min(3, (devLevels(history)[sit.key] ?? 0) + 1); if (lv === (devLevels(history)[sit.key] ?? 0)) return;
    log('devolution_request', act, { laneIndex: sit.laneIndex, devolutionLevel: lv, payload: { scope: 'construction', case: sit.case, key: sit.key, lane: sit.laneIndex ?? null, correctLanes: correctLanes(snap, act), anchor: false } });
  };
  const openFormulation = () => {
    setShowFormulation(true); log('formulation_panel_open', 'TSD1');
    if (correctLanes(snap, 'TSD1') >= 5) log('question_open', 'TSD1', { questionId: 1 });
  };
  const openAnchor = () => { if (act === 'TSD1') return; setShowAnchor(true); log('anchor_open', act); };

  /* ───────── navegación con bloqueos pedagógicos ───────── */
  const Q_TITLES = [['q1', 'Pregunta 1: observación de la regularidad'], ['q2', 'Pregunta 2: búsqueda de una medida común'], ['q3', 'Pregunta 3: del largo al nombre numérico'], ['q4', 'Pregunta 4: relación entre escalones sucesivos']] as const;
  const form1Done = Q_TITLES.every(([k]) => substantive(answers[k]));
  const bridge2Done = substantive(answers.tsd2Bridge);
  /* qué falta para entrar a TSD 2 o TSD 3 (alimenta el globo al pasar el mouse y la ventana de bloqueo) */
  const lockNeeds = (a: ActivityKey): string[] => {
    const out: string[] = [];
    if (a !== 'TSD1' && !form1Done) out.push(`Responde con tus palabras las preguntas de Formulación en TSD 1. Te faltan: ${Q_TITLES.filter(([k]) => !substantive(answers[k])).map(([k]) => k.toUpperCase()).join(', ')}.`);
    if (a === 'TSD3' && !bridge2Done) out.push('Responde la pregunta puente del Anclaje en TSD 2.');
    return out;
  };
  const switchTo = (to: ActivityKey) => {
    flushAll(); if (to === act) { setView('lab'); return; }
    const goForm = () => { setLock(null); setActive('TSD1'); openFormulation(); };
    if ((to === 'TSD2' || to === 'TSD3') && !form1Done) {
      setLock({ title: `Acceso bloqueado: ${ACTIVITY_META[to].short}`, badge: 'Formulación TSD 1 requerida', actionLabel: 'Ir a Formulación TSD 1', onAction: goForm,
        message: to === 'TSD2' ? 'Para ingresar a la TSD 2 (El Puente) debes haber contestado todas las preguntas del componente «Formulación» en la TSD 1 (El Volantín).' : 'Para avanzar a la TSD 3 (La Cerca) primero debes contestar todas las preguntas de Formulación en TSD 1 y el Anclaje en TSD 2.',
        missing: Q_TITLES.filter(([k]) => !substantive(answers[k])).map(([, t]) => t) });
      return;
    }
    if (to === 'TSD3' && !bridge2Done) {
      setLock({ title: 'Acceso bloqueado: TSD 3 (La Cerca)', badge: 'Anclaje TSD 2 requerido', message: 'Para acceder a la TSD 3 (La Cerca) debes haber completado la reflexión del componente «Anclaje» en la TSD 2 (El Puente).', missing: ['Responder la pregunta puente en el Anclaje de TSD 2'], actionLabel: 'Ir a Anclaje TSD 2',
        onAction: () => { setLock(null); setActive('TSD2'); setShowAnchor(true); log('anchor_open', 'TSD2'); } });
      return;
    }
    const first = !history.some((e) => e.activity === to);
    log('activity_switch', to, { payload: { from: act, to } }); setActive(to); setSelected(null); setView('lab');
    if (first) { setShowInstructions(true); log('instructions_open', to, { payload: { auto: true, complete: false, prompted: false } }); }
  };

  /* ───────── reinicios ───────── */
  const resetStage = () => {
    setLanes((p) => ({ ...p, [act]: emptyLanes()[act] })); setTestArea((p) => ({ ...p, [act]: [] }));
    completedRef.current.delete(act); log('config_change', act, { payload: { setting: 'reset_stage' } });
  };
  const resetAll = () => {
    Object.values(timers.current).forEach(clearTimeout); timers.current = {};
    storage.clearSession(); const f = freshSession();
    setLanes(emptyLanes()); setTestArea(f.testArea); setAnswers(emptyAnswers()); setFormulationStates(emptyFormulation()); setAnchorStates(emptyAnchors()); setHistory([]);
    answersRef.current = emptyAnswers(); lastLogged.current = { ...emptyAnswers() }; completedRef.current = new Set();
    setOrder(shuffledRods()); setReveal(false); setActive('TSD1'); setView('lab'); setShowIntro(true); setShowTesting(false); setSelected(null);
  };

  const navBtn = (key: string, label: string, on: boolean, onClick: () => void, icon: React.ReactNode, testid: string) => (
    <button key={key} onClick={onClick} data-testid={testid} role="tab" aria-selected={on} className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] transition ${on ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{icon}{label}</button>);
  const navTabs = (short: boolean) => (<>
    {ACTIVITIES.map((a) => {
      const needs = lockNeeds(a); const locked = needs.length > 0;
      const btn = navBtn(a, a.replace('TSD', 'TSD '), view === 'lab' && a === act, () => switchTo(a), locked ? <Lock size={12} /> : null, `act-${a}`);
      return short ? btn : <Tip key={a} title={`${ACTIVITY_META[a].short} bloqueada`} lines={needs}>{btn}</Tip>;
    })}
    {navBtn('analysis', short ? 'Análisis' : 'Análisis del participante', view === 'analysis', () => { flushAll(); setView('analysis'); }, <Activity size={13} />, 'tab-analysis')}
  </>);
  const devolution = devolutionPct(snap);
  const totalProg = Math.round((correctLanes(snap) / (LANE_COUNT.TSD1 + LANE_COUNT.TSD2 + LANE_COUNT.TSD3)) * 100);
  const activeRod = dragging ? rodOf(dragging) : null;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-chrome-bg">
      <IntroModal open={showIntro} onStart={() => { setShowIntro(false); setShowInstructions(true); }} />
      <InstructionsModal open={showInstructions && !showIntro} act={act} targetUnits={targetUnits} complete={complete} pulseDidactic={prompt}
        onClose={() => setShowInstructions(false)}
        onDidacticOpen={() => { didacticOpenedAt.current = Date.now(); log('didactic_view', act, { payload: { phase: 'open' } }); }}
        onDidacticClose={() => { const t0 = didacticOpenedAt.current; didacticOpenedAt.current = null; log('didactic_close', act, { payload: { seconds: t0 ? Math.round((Date.now() - t0) / 1000) : 0 } }); }} />
      <MessageModal open={showMessage} act={act} snap={snap} complete={complete}
        onClose={() => setShowMessage(false)}
        onReport={() => { setShowMessage(false); flushAll(); setView('analysis'); }} />
      <GuideModal open={showGuide} onClose={() => setShowGuide(false)} />
      <LockModal info={lock} onClose={() => setLock(null)} />
      <ConfirmModal open={confirm === 'all'} onClose={() => setConfirm(null)} onConfirm={resetAll} title="¿Reiniciar toda la aplicación?" label="Reiniciar todo"
        text="Esta acción vacía las tres construcciones, borra tus respuestas, devoluciones e historial de acciones. No se puede deshacer. Si aún no descargas tu reporte, hazlo antes." />
      <ConfigModal open={showConfig} onClose={() => setShowConfig(false)} classNumber={classNumber} onClass={setClassNumber} targetUnits={targetUnits}
        onTarget={(n) => { setTargetUnits(n); log('config_change', 'TSD2', { payload: { setting: 'targetUnits', value: n } }); }} inventoryCount={inventoryCount}
        onInventory={(n) => { const v = Math.max(1, Math.min(10, n || 1)); setInventoryCount(v); log('config_change', act, { payload: { setting: 'inventoryCountPerPiece', value: v } }); }}
        showNumbers={showNumbers} onNumbers={setShowNumbers} showCounter={showCounter} onCounter={setShowCounter} onResetStage={resetStage} />
      <Modal open={showDev} onClose={() => setShowDev(false)} size="lg" title="Devolución didáctica">
        <ConstructionDevolution stageName={ACTIVITY_META[act].short} situationLabel={situation.laneIndex !== undefined ? laneLabel(act, situation.laneIndex) : 'Tu construcción completa'}
          texts={DEV_TEXT[act][situation.case].map((t) => t.replace('{lane}', situation.laneIndex !== undefined ? laneLabel(act, situation.laneIndex) : 'carril'))} level={devLv} onRequest={requestConstruction}
          onOpenTesting={() => { setShowDev(false); setShowTesting(true); log('test_area_open', act, { payload: { open: true } }); }}
          onOpenFormulation={situation.case === 'completa' ? () => { setShowDev(false); if (act === 'TSD1') openFormulation(); else openAnchor(); } : undefined} />
      </Modal>
      <Modal open={showFormulation} onClose={() => { flushAll(); setShowFormulation(false); }} size="3xl" title="Formulación">
        <FormulationPanel correctLanes={correctLanes(snap, 'TSD1')} answers={answers} states={formulationStates} onAnswer={(q, t) => setAnswer(`q${q}` as AnswerKey, t)} onFlush={flushAll}
          onRequest={requestFormulation} onOpenQuestion={(q) => log('question_open', 'TSD1', { questionId: q })} onOpenTesting={() => { flushAll(); setShowFormulation(false); setShowTesting(true); log('test_area_open', act, { payload: { open: true } }); }} />
      </Modal>
      <Modal open={showAnchor && act !== 'TSD1'} onClose={() => { flushAll(); setShowAnchor(false); }} size="3xl" title="Anclaje">
        {act !== 'TSD1' && <AnchorPanel activity={act} answers={answers} anchor={anchorStates[act]} onAnswer={(a, t) => setAnswer(a === 'TSD2' ? 'tsd2Bridge' : 'tsd3Bridge', t)} onFlush={flushAll} onRequest={requestAnchor}
          onGoToTSD1={() => { flushAll(); setShowAnchor(false); switchTo('TSD1'); }} onOpenTesting={() => { flushAll(); setShowAnchor(false); setShowTesting(true); log('test_area_open', act, { payload: { open: true } }); }} />}
      </Modal>

      <AppHeader>
        <div className="hidden gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs md:flex" role="tablist">{navTabs(false)}</div>
        <button onClick={() => { setReveal((v) => !v); log('config_change', act, { payload: { setting: 'reveal_correct', value: !reveal } }); }} data-testid="btn-eye" aria-pressed={reveal} className={`btn-ghost !px-2.5 ${reveal ? '!border-brand-200 !bg-brand-50 !text-brand-500' : ''}`} title={reveal ? 'Ocultar construcciones correctas' : 'Mostrar construcciones correctas'} aria-label={reveal ? 'Ocultar construcciones correctas' : 'Mostrar construcciones correctas'}>{reveal ? <Eye size={15} /> : <EyeOff size={15} />}</button>
        <button onClick={() => setShowGuide(true)} className="btn-ghost !px-2.5" title="Ayuda" aria-label="Ayuda"><HelpCircle size={15} /></button>
        <button onClick={() => setShowConfig(true)} className="btn-ghost !px-2.5" title="Configuración" aria-label="Configuración" data-testid="btn-config"><Settings size={15} /></button>
        <button onClick={() => setConfirm('all')} className="btn-ghost !px-2.5 hover:!bg-rose-50 hover:!text-rose-600" title="Reiniciar" aria-label="Reiniciar" data-testid="btn-reset"><RotateCcw size={15} /></button>
      </AppHeader>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 md:hidden" role="tablist">{navTabs(true)}</div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {view === 'analysis' ? (
          <div className="flex-1 overflow-y-auto"><AnalysisView snap={snap} classNumber={classNumber} name={name} onName={setName} onFlush={flushAll} onClear={() => setHistory([])} /></div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
            <main className="flex flex-1 flex-col overflow-hidden md:flex-row">
              <aside className="flex max-h-[38vh] w-full shrink-0 flex-col overflow-y-auto border-b border-slate-200 bg-chrome-bg p-4 md:max-h-none md:w-64 md:border-b-0 md:border-r lg:w-72 lg:p-5">
                <p className="micro mb-3">Estadísticas</p>
                <div className="mb-4 space-y-3">
                  <div className="card p-3"><div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-wider"><span className="text-slate-500">Devolución</span><span className="text-brand-500 font-title" data-testid="devolution">{devolution}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-brand-500 transition-all" style={{ width: `${devolution}%` }} /></div></div>
                  <div className="card p-3"><div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-wider"><span className="text-slate-500">Construcción completada</span><span className="text-brand-500 font-title" data-testid="progress">{totalProg}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-accent transition-all" style={{ width: `${totalProg}%` }} /></div></div>
                </div>
                <div className="mb-2 flex items-center justify-between"><p className="micro text-sm !text-brand-500 font-title !tracking-widest">Depósito</p>{selected && <span className="pill border-brand-200 bg-brand-50 !py-0 text-[10px] text-brand-500">Elegida: {rodOf(selected)?.name}</span>}</div>
                <div className="grid grid-cols-2 gap-1 md:grid-cols-1" data-testid="deposit">{order.map((len) => <DepositRod key={len} length={len} count={inventory[len] ?? 0} selected={selected === len} showNumber={showNumbers} onSelect={() => setSelected((s) => (s === len ? null : len))} />)}</div>
                <p className="micro mt-3 !normal-case !tracking-normal">Arrastra una regleta a un carril, o haz clic en ella y luego en el carril.</p>
              </aside>

              <section className="flex-1 space-y-4 overflow-y-auto p-4 lg:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <span className="pill border-brand-100 bg-brand-50 text-[10px] uppercase tracking-widest text-brand-500">Desafío actual</span>
                    <h2 className="mt-2 text-3xl text-slate-900" data-testid="scenario-title">{ACTIVITY_META[act].name}</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-600">{act === 'TSD2' ? `Reconstruye las 4 vías de paso del puente cubriendo cada una exactamente con regletas.` : act === 'TSD1' ? 'Completa cada escalón con regletas para que Pedro pueda alcanzar su volantín.' : 'Cerca el perímetro de la casa: cada lado mide 12 unidades y debe cumplir su pista lógica.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className={`btn-ghost ${prompt ? 'pulse-ok' : ''}`} onClick={openInstructions} data-testid="btn-instructions" data-prompt={prompt ? '1' : '0'}><BookOpen size={14} />Instrucciones</button>
                    <button className={`btn-ghost ${showTesting ? '!border-accent/60 !bg-accent-soft' : ''}`} onClick={() => toggleTesting(!showTesting)} data-testid="btn-experimenta"><FlaskConical size={14} />Experimenta</button>
                    <button className="btn-primary !bg-accent hover:!bg-amber-600" onClick={() => setShowDev(true)} data-testid="btn-devolution-construction"><Lightbulb size={14} />Devolución</button>
                    <button className="btn-ghost" onClick={() => { setShowMessage(true); log('message_view', act, { payload: { complete } }); }} data-testid="btn-message"><Send size={14} />Mensaje</button>
                    {act === 'TSD1' ? <button className="btn-primary" onClick={openFormulation} data-testid="btn-formulation"><Brain size={14} />Formulación</button> : <button className="btn-primary" onClick={openAnchor} data-testid="btn-anchor"><Bookmark size={14} />Anclaje</button>}
                  </div>
                </div>

                <div className="relative flex" data-testid="workspace">
                  <Scene act={act} lanes={actLanes} cfg={cfg} showCounter={showCounter} showNumber={showNumbers} placeMode={selected !== null} reveal={reveal} onRemove={removeRod} onPlaceSelected={placeSelected} />
                  {showTesting && <TestingArea pieces={pieces} onRemovePiece={(id) => removeTestPiece(id)} onClose={() => toggleTesting(false)} showNumber={showNumbers} hasSelected={selected !== null} onSelectedDrop={dropSelectedInTesting} />}
                </div>

                <div className="card flex flex-col items-center border-dashed p-5 text-center"><Activity className="mb-2 text-brand-500" />
                  <h3 className="text-xs uppercase tracking-widest text-slate-900">Reflexión didáctica</h3>
                  <p className="micro mt-1 max-w-md">{reveal && complete ? <>¡Completaste {ACTIVITY_META[act].name}! Revisa el mensaje encriptado, responde {act === 'TSD1' ? 'la formulación' : 'el anclaje'} y, al terminar las tres situaciones, descarga tu reporte en «Análisis del participante».</> : <>Cuando termines las tres situaciones, ve a «Análisis del participante» y descarga tu reporte.</>}</p>
                  <button className="btn-ghost mt-3" onClick={() => { flushAll(); setView('analysis'); }}><Activity size={14} />Ver mi análisis</button></div>
              </section>

              <aside className="hidden w-72 shrink-0 flex-col gap-6 overflow-y-auto border-l border-slate-200 bg-chrome-bg p-5 xl:flex">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2"><ClipboardList size={16} className="text-brand-500" /><h3 className="text-xs uppercase tracking-widest text-slate-900">Hoja de ruta</h3></div>
                <nav className="space-y-5">{ACTIVITIES.map((a, i) => { const done = reveal && activityComplete(snap, a); return (
                  <div key={a} className={`relative pl-8 ${done || a === act ? '' : 'opacity-50'}`}><div className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-title ${done ? 'bg-brand-500 text-white' : 'border border-slate-300 bg-white text-slate-400'}`}>{i + 1}</div>
                    {i < 2 && <div className="absolute left-3 top-7 h-9 w-px bg-slate-200" />}<h4 className="mb-0.5 text-xs text-slate-900">{ACTIVITY_META[a].short}</h4><p className="text-[10px] leading-relaxed text-slate-500">{ACTIVITY_META[a].scene}{reveal ? ` · ${correctLanes(snap, a)}/${LANE_COUNT[a]} correctos` : ''}</p></div>); })}</nav>
                <div className="mt-auto rounded-xl border border-slate-200 bg-white p-4"><p className="micro mb-1">Base teórica</p><p className="text-[11px] italic text-slate-600">«El alumno aprende adaptándose a un medio que es factor de contradicciones, de dificultades, de desequilibrios.» — Brousseau</p></div>
              </aside>
              <DragOverlay dropAnimation={null}>{activeRod ? <RodBar length={activeRod.length} className="rotate-2 shadow-xl ring-2 ring-brand-400" /> : null}</DragOverlay>
            </main>
          </DndContext>
        )}
      </div>
      <footer className="flex h-7 shrink-0 items-center justify-center border-t border-slate-200 bg-white px-4"><p className="text-[10px] uppercase tracking-widest text-slate-400">{APP_META.name} © 2026 · {INSTITUTION} · v{APP_VERSION} · {BUILD_DATE}</p></footer>
    </div>
  );
}
