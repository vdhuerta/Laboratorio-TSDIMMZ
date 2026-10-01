import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, FlaskConical, GraduationCap, Info, Lightbulb, Lock, Send, Trophy } from 'lucide-react';
import { ADMIN_DEFAULT_PIN, APP_META } from '../config';
import { PLAN_CLASSES } from '../data/plan';
import { ACTIVITY_META, HEADER_IMAGE, INTRO, TSD3_SIDES } from '../data/lab';
import type { ActivityKey, Snapshot } from '../labTypes';
import { encryptedMessage } from '../lib/immzReport';
import { Modal } from './ui';

export function IntroModal({ open, onStart }: { open: boolean; onStart: () => void }) {
  return (
    <Modal open={open} onClose={onStart} size="3xl" title={APP_META.name}>
      <div className="space-y-4 text-sm text-slate-600">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><img src={HEADER_IMAGE} alt="" className="max-h-52 w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /></div>
        <p>Bienvenida/o al <b>{APP_META.name}</b>. Resolverás tres situaciones con <b>regletas Cuisenaire</b>: <b>El Volantín</b> (la escalera), <b>El Puente</b> (las cuatro vías) y <b>La Cerca</b> (el perímetro de la casa). En cada una primero <b>actúas</b> sobre el material, luego <b>formulas</b> por escrito lo que descubres y el medio te <b>valida</b> la construcción.</p>
        <div className="grid gap-3 sm:grid-cols-3">{(['TSD1', 'TSD2', 'TSD3'] as ActivityKey[]).map((a, i) => (
          <div key={a} className="rounded-xl border border-slate-200 bg-white p-3"><p className="micro !text-brand-500">TSD {i + 1}</p><p className="text-sm text-slate-900 font-title">{ACTIVITY_META[a].name}</p><p className="mt-1 text-xs text-slate-500">{ACTIVITY_META[a].scene}</p></div>))}</div>
        <p className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-600">Al terminar, entra a «Análisis del participante», descarga tu reporte <span className="font-mono">{APP_META.filenamePrefix}Nombre_ID.html</span> y adjúntalo, sin modificarlo, en tu entrada del Diario de Campo.</p>
      </div>
      <div className="mt-5 text-center"><button className="btn-primary" data-testid="btn-start" onClick={onStart}>Comenzar<ChevronRight size={14} /></button></div>
    </Modal>
  );
}

export function InstructionsModal({ open, act, targetUnits, complete, onClose, onDidacticClose }: { open: boolean; act: ActivityKey; targetUnits: number; complete: boolean; onClose: () => void; onDidacticClose: () => void }) {
  const [didactic, setDidactic] = useState(false);
  useEffect(() => { if (!open) setDidactic(false); }, [open]);
  const t = INTRO[act];
  if (didactic) return (
    <Modal open={open} onClose={() => { setDidactic(false); onDidacticClose(); }} size="3xl" title="Mirada didáctica">
      <div className="space-y-4 text-sm text-slate-600">
        <div className="rounded-xl bg-brand-500 p-4 text-white"><p className="micro !text-accent">Enfoque teórico integrado</p><p className="mt-1 text-sm leading-relaxed">Esta experiencia articula la <i>Teoría de las Situaciones Didácticas</i> de Guy Brousseau con los <i>Registros de Representación Semiótica</i> de Raymond Duval.</p></div>
        <section className="rounded-xl border border-slate-200 p-4"><h4 className="mb-2 text-xs uppercase tracking-widest text-brand-500">1. Registros de representación (Duval)</h4>
          <p>El éxito en matemáticas depende de movilizar al menos dos registros. Aquí operamos en tres:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5"><li><b>Icónico / gráfico:</b> manipulación de las regletas como extensiones espaciales.</li><li><b>Simbólico:</b> la codificación final (por ejemplo 2+3+4 = 9), donde el color se transforma en número.</li><li><b>Lengua natural:</b> las pistas y las formulaciones escritas.</li></ul>
          <p className="mt-2"><b>Tratamiento:</b> operar dentro de un mismo registro (sumar mentalmente 2+3+4). <b>Conversión:</b> el paso de la regleta visual al símbolo numérico.</p></section>
        <section className="rounded-xl border border-slate-200 p-4"><h4 className="mb-2 text-xs uppercase tracking-widest text-brand-500">2. El medio didáctico (Brousseau)</h4>
          <p><b>Acción y formulación:</b> el estudiante interactúa con el milieu y, al escribir su regularidad, comunica su estrategia con un lenguaje cada vez más formal.</p>
          <p className="mt-2"><b>Validación:</b> el sistema actúa como juez: si la suma no es exacta, no hay validación. El estudiante retroalimenta su estrategia sin intervención directa del docente.</p></section>
        <section className="rounded-xl border border-slate-200 p-4"><h4 className="mb-2 text-xs uppercase tracking-widest text-brand-500">3. Complejidad aditiva</h4>
          <p>Cuanto mayor es el entero, más particiones posee: el 5 admite 7 descomposiciones únicas; el 9, 29. El estudiante pasa de ensayar al azar a organizar sistemáticamente sus conversiones y tratamientos.</p></section>
        <p className="rounded-xl border border-accent/30 bg-accent-soft p-3 text-xs italic text-amber-900"><Trophy size={13} className="mr-1 inline" />«La descomposición aditiva es la base para la comprensión del sistema decimal. El error aquí no es una falla, sino un obstáculo epistemológico necesario para la reconstrucción del saber.»</p>
      </div>
      <div className="mt-5 text-center"><button className="btn-primary" onClick={() => { setDidactic(false); onDidacticClose(); }}>Volver a instrucciones</button></div>
    </Modal>);
  return (
    <Modal open={open} onClose={() => onClose()} size="3xl" title="Instrucciones">
      <div className="space-y-4 text-sm text-slate-600">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white"><FlaskConical size={20} /></div><div><p className="micro">{t.kicker}</p><p className="text-base text-slate-900 font-title">{t.hook}</p></div></div>
        <p className="rounded-xl bg-slate-50 p-4">{t.story}</p>
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4"><p className="micro mb-1 !text-brand-500">{act === 'TSD3' ? 'Pistas lógicas' : act === 'TSD2' ? 'Objetivo' : 'Consigna'}</p>
          {act === 'TSD3' ? <ul className="space-y-1">{TSD3_SIDES.map((s) => <li key={s.idx}><span className="text-brand-500">{s.name} ({s.label}):</span> {s.clue}</li>)}</ul> : <p className="text-slate-800">{t.goal.replace('{N}', String(targetUnits))}</p>}</div>
        <div><p className="micro mb-2">Misión · pasos 1 al 4</p><ol className="space-y-2">{t.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500 font-title">{i + 1}</span><span>{s}</span></li>)}</ol></div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button className="btn-ghost justify-center sm:flex-1" disabled={!complete} data-testid="btn-didactic" onClick={() => setDidactic(true)}>{!complete && <Lock size={13} />}Mirada didáctica</button>
        <button className="btn-primary justify-center sm:flex-[2]" data-testid="btn-close-instructions" onClick={() => onClose()}>Comenzar operación<ChevronRight size={14} /></button>
      </div>
    </Modal>
  );
}

export function MessageModal({ open, act, snap, complete, onClose, onReport }: { open: boolean; act: ActivityKey; snap: Snapshot; complete: boolean; onClose: () => void; onReport: () => void }) {
  const t = INTRO[act];
  return (
    <Modal open={open} onClose={() => onClose()} title="Mensaje encriptado">
      <p className="micro mb-3">Control de construcción · {ACTIVITY_META[act].name}</p>
      <div className="min-h-[170px] rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        {complete ? (
          <div className="space-y-3"><p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs uppercase tracking-wider text-emerald-700"><Trophy size={15} />{t.success}</p>
            <p className="micro">{t.summary}</p>
            <div className="rounded-lg border border-slate-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-brand-500" data-testid="encrypted">
              {act === 'TSD3' ? TSD3_SIDES.map((s) => <div key={s.idx} className="flex justify-between border-b border-slate-100 py-0.5 last:border-0"><span className="text-slate-400">{s.label}</span><span>{s.expr} = 12</span></div>) : encryptedMessage(snap, act).map((l) => <div key={l}>{l}</div>)}
            </div></div>
        ) : (<div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center"><Lock className="mb-2 text-slate-400" /><p className="text-xs uppercase tracking-wider text-slate-900">Construcción incompleta</p><p className="mt-1 text-xs text-slate-500">{t.incomplete}</p></div>)}
      </div>
      <div className="mt-4 flex gap-2"><button className="btn-ghost flex-1 justify-center" onClick={() => onClose()}>Cerrar</button><button className="btn-primary flex-[2] justify-center" disabled={!complete} data-testid="btn-to-report" onClick={onReport}>Ir a mi análisis<Send size={13} /></button></div>
    </Modal>
  );
}

export function GuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const step = (n: string, t: string, d: ReactNode) => <div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 font-title">{n}</span><div><p className="text-sm text-slate-900 font-title">{t}</p><p className="text-sm text-slate-500">{d}</p></div></div>;
  return (
    <Modal open={open} onClose={onClose} size="3xl" title={`Guía del ${APP_META.name}`}>
      <div className="space-y-5 text-sm text-slate-600">
        <section><h4 className="mb-2 flex items-center gap-2 text-slate-900"><Info size={16} className="text-accent" />¿Qué es este laboratorio?</h4><div className="space-y-2 rounded-xl bg-slate-50 p-4"><p>Tres situaciones didácticas con regletas Cuisenaire para trabajar la composición y descomposición aditiva. Sigues la secuencia de Brousseau: <b>acción</b> (construyes), <b>formulación</b> (escribes lo que descubres), <b>validación</b> (el medio confirma) e <b>institucionalización</b> (la mirada didáctica).</p></div></section>
        <section><h4 className="mb-2 flex items-center gap-2 text-slate-900"><Lightbulb size={16} className="text-emerald-600" />Cómo usar la aplicación</h4><div className="space-y-4">
          {step('01', 'Arrastra o haz clic', 'Arrastra una regleta del depósito a un carril, o haz clic en la regleta y luego en el carril. Un clic sobre una regleta puesta la quita.')}
          {step('02', 'Experimenta, formula y pide devoluciones', 'Experimenta es una mesa libre. Las preguntas de formulación (TSD 1) y los anclajes (TSD 2 y 3) se desbloquean al avanzar, y cada una admite hasta tres devoluciones didácticas.')}
          {step('03', 'Análisis y reporte', 'En «Análisis del participante» ves tus 10 indicadores (IMMZ e IDCD) y descargas el «Análisis IMMZ (HTML)» que debes adjuntar a tu Diario de Campo.')}</div></section>
        <section className="rounded-xl border border-brand-100 bg-brand-50 p-4"><h4 className="mb-1 text-brand-500">Conexión con el Diario de Campo</h4><p>Descarga el reporte <span className="font-mono text-xs">{APP_META.filenamePrefix}Nombre_ID.html</span> y adjúntalo <u>sin modificarlo</u> en tu entrada del Diario (APP «{APP_META.name}»). Ahí escribirás tu reflexión metacognitiva sobre estas mismas trazas.</p></section>
      </div>
      <div className="mt-5 text-center"><button className="btn-primary" onClick={onClose}>Entendido</button></div>
    </Modal>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, text, label }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text: string; label: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="mb-4 flex gap-3 text-sm text-slate-600"><AlertTriangle className="shrink-0 text-rose-500" />{text}</div>
      <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-danger" data-testid="btn-confirm" onClick={() => { onConfirm(); onClose(); }}>{label}</button></div>
    </Modal>
  );
}

export interface LockInfo { title: string; badge: string; message: string; missing: string[]; actionLabel: string; onAction: () => void }
export function LockModal({ info, onClose }: { info: LockInfo | null; onClose: () => void }) {
  if (!info) return null;
  return (
    <Modal open onClose={onClose} title={info.title} tone="amber">
      <span className="pill mb-3 border-accent/40 bg-accent-soft text-[10px] uppercase tracking-wider text-amber-800">{info.badge}</span>
      <p className="text-sm text-slate-600">{info.message}</p>
      {info.missing.length > 0 && <ul className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{info.missing.map((m) => <li key={m} className="flex gap-2"><Lock size={12} className="mt-0.5 shrink-0 text-slate-400" />{m}</li>)}</ul>}
      <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Volver</button><button className="btn-primary" data-testid="btn-lock-action" onClick={info.onAction}>{info.actionLabel}<ChevronRight size={13} /></button></div>
    </Modal>
  );
}

export interface ConfigProps { open: boolean; onClose: () => void; classNumber: number | null; onClass: (c: number | null) => void; targetUnits: number; onTarget: (n: number) => void; inventoryCount: number; onInventory: (n: number) => void; showNumbers: boolean; onNumbers: (v: boolean) => void; showCounter: boolean; onCounter: (v: boolean) => void; onResetStage: () => void }
export function ConfigModal(p: ConfigProps) {
  const [pin, setPin] = useState(''); const [ok, setOk] = useState(false); const [err, setErr] = useState(false);
  const unlock = () => { if (pin === ADMIN_DEFAULT_PIN) { setOk(true); setErr(false); } else { setErr(true); setTimeout(() => setErr(false), 1800); } };
  const close = () => { setOk(false); setPin(''); p.onClose(); };
  const Row = ({ title, hint, children }: { title: string; hint: string; children: ReactNode }) => <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><div><p className="text-sm text-slate-900">{title}</p><p className="text-xs text-slate-500">{hint}</p></div>{children}</div>;
  return (
    <Modal open={p.open} onClose={close} title="Panel de configuración">
      {!ok ? (
        <div className="space-y-4 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500"><Lock /></div><p className="text-sm text-slate-500">Ingresa la clave de administrador para continuar</p>
          <input type="password" autoFocus data-testid="pin-input" className={`input text-center text-2xl tracking-[0.8em] ${err ? '!border-rose-300' : ''}`} value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()} placeholder="••••" />
          {err && <p className="text-xs text-rose-500">Clave incorrecta</p>}<button className="btn-primary w-full justify-center" onClick={unlock}>Verificar clave</button></div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><GraduationCap className="text-emerald-600" /><div><p className="text-sm text-emerald-800 font-title">Modo educador activo</p><p className="micro !text-emerald-600">Privilegios concedidos</p></div></div>
          <Row title="Largo de las vías del puente (TSD 2)" hint="Unidades que debe medir cada vía (5 a 9)"><select className="input !w-20" value={p.targetUnits} onChange={(e) => p.onTarget(Number(e.target.value))}>{[5, 6, 7, 8, 9].map((n) => <option key={n}>{n}</option>)}</select></Row>
          <Row title="Regletas por pieza" hint="Unidades disponibles de cada largo (1 a 10)"><input type="number" min={1} max={10} className="input !w-20" value={p.inventoryCount} onChange={(e) => p.onInventory(Number(e.target.value))} /></Row>
          <Row title="Mostrar el número al pasar el cursor" hint="Muestra el largo de cada regleta"><input type="checkbox" className="h-4 w-4 accent-[#24473A]" checked={p.showNumbers} onChange={(e) => p.onNumbers(e.target.checked)} /></Row>
          <Row title="Mostrar contador suma/meta" hint="Ayuda visible sobre cada carril"><input type="checkbox" className="h-4 w-4 accent-[#24473A]" checked={p.showCounter} onChange={(e) => p.onCounter(e.target.checked)} /></Row>
          <Row title="Reiniciar la etapa actual" hint="Vacía los carriles y Experimenta de esta TSD"><button className="btn-ghost" onClick={() => { p.onResetStage(); close(); }}>Reiniciar</button></Row>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><label className="label" htmlFor="cls">Clase que declara el reporte (Plan Orientador)</label>
            <select id="cls" className="input" value={p.classNumber ?? ''} onChange={(e) => p.onClass(e.target.value ? Number(e.target.value) : null)}><option value="">No declarar clase (el Diario usará la de la entrada)</option>{PLAN_CLASSES.map((c) => <option key={c.number} value={c.number}>{c.title}</option>)}</select>
            <p className="mt-1 text-[11px] text-slate-500">Debe coincidir con la clase configurada para «{APP_META.name}» en el Diario de Campo (por defecto, Clase {APP_META.defaultClassNumber}). Si difiere, el auditor del Diario marcará la discrepancia R11.</p></div>
          <button className="w-full py-2 text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600" onClick={close}>Cerrar sesión admin</button>
        </div>)}
    </Modal>
  );
}
