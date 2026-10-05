import { useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, Eye, GraduationCap, HelpCircle, Info, Layout, Lightbulb, Lock, Scale, Search, Users, XCircle } from 'lucide-react';
import { ADMIN_DEFAULT_PIN, APP_META } from '../config';
import { PLAN_CLASSES } from '../data/plan';
import { FORMAS, PHASES_CONFIG, type Card, type Forma } from '../data/cards';
import { Modal } from './ui';

export function HelpModal({ open, onClose, scenario }: { open: boolean; onClose: () => void; scenario?: string }) {
  const phase = (n: string, t: string, d: string, c: string) => <div className="rounded-xl border border-slate-100 bg-white p-4"><h4 className={`text-xs uppercase tracking-widest ${c}`}>{n}. {t}</h4><p className="mt-1 text-sm text-slate-600">{d}</p></div>;
  const step = (n: string, t: ReactNodeLike, d: string) => <div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 font-title">{n}</span><div><p className="text-sm text-slate-900 font-title">{t}</p><p className="text-sm text-slate-500">{d}</p></div></div>;
  return (
    <Modal open={open} onClose={onClose} size="3xl" title="Guía del Simulador TSD">
      <div className="space-y-6 text-sm text-slate-600">
        <section><h4 className="mb-2 flex items-center gap-2 text-slate-900"><Info size={16} className="text-accent" />¿Qué es este simulador?</h4>
          <div className="space-y-2 rounded-xl bg-slate-50 p-4"><p>Este entorno interactivo te permite experimentar con la <b>Teoría de las Situaciones Didácticas (TSD)</b> de Guy Brousseau. Tu objetivo es organizar correctamente una secuencia de enseñanza basada en el desafío «{scenario ?? APP_META.scenarioName}», diseñado para niños de Educación Parvularia.</p><p>Debes clasificar las <b>tarjetas de intervención</b> en las fases de la TSD, analizando quién tiene el protagonismo en cada momento: el niño (alumno) o la educadora (docente).</p></div></section>
        <section><h4 className="mb-2 flex items-center gap-2 text-slate-900"><BookOpen size={16} className="text-brand-500" />Fases de la secuencia didáctica</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {phase('1', 'Acción', 'El niño interactúa directamente con el problema y prueba estrategias por sí solo.', 'text-sky-700')}
            {phase('2', 'Formulación', 'El niño explica su estrategia a otros; el conocimiento se vuelve explícito.', 'text-brand-500')}
            {phase('3', 'Validación', 'Los niños debaten la veracidad de las estrategias; no es la educadora quien dice «está bien».', 'text-amber-700')}
            {phase('4', 'Institucionalización', 'La educadora da estatus oficial al saber construido.', 'text-indigo-700')}</div></section>
        <section><h4 className="mb-2 flex items-center gap-2 text-slate-900"><Lightbulb size={16} className="text-emerald-600" />Cómo usar la aplicación</h4>
          <div className="space-y-4">
            {step('01', 'Arrastrar y soltar', 'Mueve las tarjetas del mazo a las columnas de fase. Pulsa «Verificar diseño» para ver aciertos y errores.')}
            {step('02', <>Reflexión teórica (lupa <Search size={12} className="inline" />)</>, 'Abre la devolución didáctica de cada tarjeta ya ubicada. Es clave para tu apropiación teórica.')}
            {step('03', 'Análisis y reporte', 'En «Análisis del participante» ves tus 10 indicadores (IMMZ e IDCD) y descargas el «Análisis IMMZ (HTML)» que debes adjuntar a tu Diario de Campo.')}</div></section>
        <section className="rounded-xl border border-brand-100 bg-brand-50 p-4"><h4 className="mb-1 text-brand-500">Conexión con el Diario de Campo</h4><p>Al terminar, descarga el reporte <span className="font-mono text-xs">{APP_META.filenamePrefix}Nombre_ID.html</span> y adjúntalo <u>sin modificarlo</u> en tu entrada del Diario (APP «{APP_META.name}»). Ahí escribirás tu reflexión metacognitiva sobre estas mismas trazas.</p></section>
      </div>
      <div className="mt-5 text-center"><button className="btn-primary" onClick={onClose}>Comenzar simulación</button></div>
    </Modal>
  );
}
type ReactNodeLike = React.ReactNode;

export function AnalysisModal({ card, open, onClose, feedback }: { card: Card | null; open: boolean; onClose: () => void; feedback: { title: string; text: string; ok: boolean } | null }) {
  if (!card || !feedback) return null;
  return (
    <Modal open={open} onClose={onClose} size="3xl" title="Análisis didáctico">
      <p className="micro mb-3">Devolución y reflexión de Brousseau · Tarjeta de {card.type} · Fase {PHASES_CONFIG[card.correctPhase].letter}</p>
      <p className="mb-5 rounded-xl bg-slate-50 p-4 text-lg leading-snug text-slate-900">«{card.content}»</p>
      <div className="mb-3 flex items-center gap-3"><span className={`rounded-xl p-2 ${feedback.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{feedback.ok ? <CheckCircle2 size={20} /> : <HelpCircle size={20} />}</span><h4 className="text-sm uppercase tracking-widest text-slate-900">{feedback.title}</h4></div>
      <p className="border-l-4 border-brand-200 pl-3 text-sm leading-relaxed text-slate-600">{feedback.text}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-[10px] uppercase tracking-widest text-slate-500"><div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3"><Users size={16} className="text-brand-400" />Contrato didáctico</div><div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3"><Layout size={16} className="text-brand-400" />Milieu</div></div>
      <div className="mt-5 text-center"><button className="btn-primary" onClick={onClose}>Cerrar análisis</button></div>
    </Modal>
  );
}

/**
 * Juicio de calibración (IM11), antes de confirmar el destino de una tarjeta.
 * Sin preselección ni opción "no sé": cerrar el modal (X, fondo o Esc) NO registra
 * juicio — solo onAnswer(Sí/No) lo hace. Siempre se llama onClose después, para que
 * App.tsx registre el 'move' pase lo que pase.
 */
export function ConjectureModal({ card, open, onAnswer, onClose }: { card: Card | null; open: boolean; onAnswer: (declared: boolean) => void; onClose: () => void }) {
  if (!card) return null;
  return (
    <Modal open={open} onClose={onClose} title="Antes de confirmar…">
      <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-brand-50 p-2 text-brand-500"><Scale size={20} /></span><p className="text-sm text-slate-600">Calibración del juicio metacognitivo (IM11)</p></div>
      <p className="mb-5 rounded-xl bg-slate-50 p-4 text-base leading-snug text-slate-900">«{card.content}»</p>
      <p className="mb-5 text-sm text-slate-700">¿Crees que esta tarjeta está en la fase correcta?</p>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onAnswer(true)} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-sm text-emerald-700 transition hover:bg-emerald-100"><CheckCircle2 size={16} />Sí</button>
        <button onClick={() => onAnswer(false)} className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-3 text-sm text-rose-700 transition hover:bg-rose-100"><XCircle size={16} />No</button>
      </div>
      <p className="mt-4 text-center text-[11px] text-slate-400">Tu movimiento ya quedó registrado. Responder es opcional, pero solo cuenta para IM11 si respondes.</p>
    </Modal>
  );
}

export function ConfirmModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="¿Reiniciar progreso?">
      <div className="mb-4 flex gap-3 text-sm text-slate-600"><AlertTriangle className="shrink-0 text-rose-500" />Esta acción restablece el mazo, borra tu historial de movimientos y el análisis de apropiación. No se puede deshacer. Si aún no descargas tu reporte, hazlo antes.</div>
      <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-danger" onClick={() => { onConfirm(); onClose(); }}>Reiniciar todo</button></div>
    </Modal>
  );
}

export function ConfigModal({ open, onClose, onShowSolution, classNumber, onClass, formaId, onForma, judgmentEnabled, onJudgmentEnabled }: { open: boolean; onClose: () => void; onShowSolution: () => void; classNumber: number | null; onClass: (c: number | null) => void; formaId: Forma['id']; onForma: (id: Forma['id']) => void; judgmentEnabled: boolean; onJudgmentEnabled: (v: boolean) => void }) {
  const [pin, setPin] = useState(''); const [ok, setOk] = useState(false); const [err, setErr] = useState(false);
  const unlock = () => { if (pin === ADMIN_DEFAULT_PIN) { setOk(true); setErr(false); } else { setErr(true); setTimeout(() => setErr(false), 1800); } };
  const close = () => { setOk(false); setPin(''); onClose(); };
  return (
    <Modal open={open} onClose={close} title="Panel de configuración">
      {!ok ? (
        <div className="space-y-4 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500"><Lock /></div><p className="text-sm text-slate-500">Ingresa la clave de administrador para continuar</p>
          <input type="password" autoFocus className={`input text-center text-2xl tracking-[0.8em] ${err ? '!border-rose-300' : ''}`} value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()} placeholder="••••" />
          {err && <p className="text-xs text-rose-500">Clave incorrecta</p>}<button className="btn-primary w-full justify-center" onClick={unlock}>Verificar clave</button></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><GraduationCap className="text-emerald-600" /><div><p className="text-sm text-emerald-800 font-title">Modo educador activo</p><p className="micro !text-emerald-600">Privilegios concedidos</p></div></div>
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center gap-3"><Eye size={18} className="text-brand-500" /><div><p className="text-sm text-slate-900">Visualizar solución</p><p className="text-xs text-slate-500">Hoja de respuestas maestra</p></div></div><button className="btn-primary" onClick={() => { onShowSolution(); close(); }}>Entrar</button></div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><label className="label" htmlFor="cls">Clase que declara el reporte (Plan Orientador)</label>
            <select id="cls" className="input" value={classNumber ?? ''} onChange={(e) => onClass(e.target.value ? Number(e.target.value) : null)}>
              <option value="">No declarar clase (el Diario usará la de la entrada)</option>
              {PLAN_CLASSES.map((c) => <option key={c.number} value={c.number}>{c.title}</option>)}</select>
            <p className="mt-1 text-[11px] text-slate-500">Debe coincidir con la clase configurada para «{APP_META.name}» en el Diario de Campo (por defecto, Clase 1). Si difiere, el auditor del Diario marcará la discrepancia R11.</p></div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><label className="label" htmlFor="forma">Forma del contenido</label>
            <select id="forma" className="input" value={formaId} onChange={(e) => onForma(e.target.value as Forma['id'])}>
              {FORMAS.map((f) => <option key={f.id} value={f.id}>Forma {f.id} — {f.nombre} (nivel {f.contentLevel})</option>)}</select>
            <p className="mt-1 text-[11px] text-slate-500">Misma arquitectura (16 tarjetas, 4 por fase) con un dominio matemático distinto en cada forma, para medir hasta tres veces en el semestre sin repetir la tarea. El reporte queda marcado con <span className="font-mono">form_id</span> y <span className="font-mono">content_id</span>.</p>
            <p className="mt-2 text-[11px] text-amber-700">Cambiar de forma reinicia el tablero, el historial y el análisis de esta sesión (igual que «Reiniciar»). Elígela antes de que la estudiante empiece a mover tarjetas.</p></div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Scale size={18} className="text-brand-500" /><div><p className="text-sm text-slate-900">Juicio de calibración antes de validar (IM11)</p><p className="text-xs text-slate-500">Pregunta «¿crees que está en la fase correcta?» antes de cada tarjeta.</p></div></div>
              <button role="switch" aria-checked={judgmentEnabled} onClick={() => onJudgmentEnabled(!judgmentEnabled)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${judgmentEnabled ? 'bg-brand-500' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${judgmentEnabled ? 'left-5' : 'left-0.5'}`} /></button></div>
            <p className="mt-2 text-[11px] text-amber-700">Si lo apagas, IM11 queda sin evidencia en todos los reportes de esta sesión: ningún movimiento posterior generará el juicio que ese indicador necesita.</p>
          </div>
          <button className="w-full py-2 text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600" onClick={close}>Cerrar sesión admin</button>
        </div>)}
    </Modal>
  );
}
