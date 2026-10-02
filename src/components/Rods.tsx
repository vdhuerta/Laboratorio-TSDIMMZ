import type { CSSProperties } from 'react';
import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { CheckCircle2, FlaskConical, X } from 'lucide-react';
import { ROD_CONFIG, ROD_WIDTH, UNIT_SIZE, rodOf } from '../data/lab';
import type { RodInstance, TestAreaPiece } from '../labTypes';

/** Regleta Cuisenaire: caja de color con el borde propio de su color. `vertical` la gira (carriles verticales). */
export function RodBar({ length, vertical = false, unit = UNIT_SIZE, showNumber = false, className = '', style }: { length: number; vertical?: boolean; unit?: number; showNumber?: boolean; className?: string; style?: CSSProperties }) {
  const r = rodOf(length)!;
  const long = length * unit;
  return (
    <div data-rod={length} className={`relative flex items-center justify-center rounded-[3px] border ${className}`}
      style={{ backgroundColor: r.color, borderColor: r.border, color: r.text, width: vertical ? ROD_WIDTH : long, height: vertical ? long : ROD_WIDTH, ...style }}>
      {showNumber && <span className="pointer-events-none text-[10px] leading-none opacity-0 transition group-hover:opacity-100">{length}</span>}
    </div>
  );
}

/** Regleta del depósito: arrastrable (o seleccionable con un clic) mientras queden unidades. */
export function DepositRod({ length, count, selected, showNumber, onSelect }: { length: number; count: number; selected: boolean; showNumber: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `rod-${length}`, data: { length }, disabled: count <= 0 });
  const r = rodOf(length)!;
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition ${selected ? 'border-brand-500 bg-brand-50' : 'border-transparent hover:bg-slate-100'} ${count <= 0 ? 'opacity-40' : ''}`} data-deposit={length}>
      <div ref={setNodeRef} {...attributes} {...listeners} onClick={() => count > 0 && onSelect()} data-testid={`rod-${length}`} title={count > 0 ? `Regleta ${r.name}` : 'Sin unidades disponibles'}
        className={`group touch-none ${count > 0 ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed grayscale'}`} style={{ opacity: isDragging ? 0.35 : 1 }}>
        <RodBar length={length} unit={13} showNumber={showNumber} className="shadow-xs" style={{ height: 20 }} />
      </div>
      <span className="micro ml-auto !text-[9px] text-slate-400">{r.name}</span>
      <span className={`pill !py-0 text-[10px] ${count > 0 ? 'border-brand-100 bg-brand-50 text-brand-500' : 'border-slate-200 bg-slate-100 text-slate-400'}`} data-testid={`count-${length}`}>{count}</span>
    </div>
  );
}

/** Carril: zona donde se sueltan las regletas. `capacity` es el largo físico; `target` la meta real (solo se muestra si showCounter). */
export function LaneView({ idx, lane, capacity, target, orientation, correct, wrong, showCounter, showNumber, placeMode, reveal, onRemove, onPlaceSelected, align = 'start', label }: {
  idx: number; lane: RodInstance[]; capacity: number; target: number; orientation: 'h' | 'v'; correct: boolean; wrong: boolean; showCounter: boolean; showNumber: boolean; placeMode: boolean; reveal: boolean;
  onRemove: (rodId: string, length: number) => void; onPlaceSelected: () => void; align?: 'start' | 'end'; label?: string;
}) {
  const { active } = useDndContext();
  const { isOver, setNodeRef } = useDroppable({ id: `lane-${idx}` });
  const total = lane.reduce((s, r) => s + r.length, 0);
  const h = orientation === 'h';
  let blocked = false;
  if (active && isOver) { const d = active.data.current as { length?: number; piece?: { length: number } } | undefined; const len = d?.length ?? d?.piece?.length ?? 0; if (total + len > capacity) blocked = true; }
  const size = capacity * UNIT_SIZE + 4;
  const okV = reveal && correct, noV = reveal && wrong;
  const tone = blocked ? 'border-rose-400 bg-rose-50/60 ring-4 ring-rose-200/60' : isOver ? 'border-brand-400 bg-brand-50/70 ring-4 ring-brand-200/60' : noV ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-300' : okV ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-300' : 'border-dashed border-slate-400 bg-white/60';
  return (
    <div className="relative">
      <div ref={setNodeRef} onClick={onPlaceSelected} data-lane={idx} data-correct={correct ? '1' : '0'} data-testid={`lane-${idx}`} title={label}
        className={`flex cursor-pointer rounded-md border-2 p-px transition ${h ? `flex-row ${align === 'end' ? 'justify-end' : ''}` : 'flex-col-reverse'} ${tone}`}
        style={{ width: h ? size : ROD_WIDTH + 6, height: h ? ROD_WIDTH + 6 : size }}>
        {lane.map((r) => (
          <button key={r.id} type="button" onClick={(e) => { e.stopPropagation(); if (placeMode) onPlaceSelected(); else onRemove(r.id, r.length); }} data-testid="placed-rod" data-length={r.length} aria-label={`Quitar regleta de ${r.length}`}
            className="group relative shrink-0 transition hover:brightness-95 focus-visible:brightness-95">
            <RodBar length={r.length} vertical={!h} showNumber={showNumber} />
          </button>))}
      </div>
      {showCounter && <span className="micro pointer-events-none absolute -top-4 left-0 !text-[9px]">{total}/{target}</span>}
      {okV && <CheckCircle2 size={14} className={`absolute rounded-full bg-white text-emerald-500 ${h ? '-right-5 top-1/2 -translate-y-1/2' : '-top-5 left-1/2 -translate-x-1/2'}`} />}
      {noV && <X size={14} className={`absolute rounded-full bg-white text-rose-500 ${h ? '-right-5 top-1/2 -translate-y-1/2' : '-top-5 left-1/2 -translate-x-1/2'}`} />}
    </div>
  );
}

function TestPiece({ piece, onRemove, showNumber }: { piece: TestAreaPiece; onRemove: (id: string, len: number) => void; showNumber: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `test-piece-${piece.id}`, data: { piece, length: piece.length } });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} onDoubleClick={() => onRemove(piece.id, piece.length)} data-testid="test-piece" data-length={piece.length} title="Arrastra para mover · doble clic para devolver al depósito"
      className="group absolute cursor-grab touch-none active:cursor-grabbing" style={{ left: piece.x, top: piece.y, opacity: isDragging ? 0.3 : 1, zIndex: isDragging ? 40 : 10 }}>
      <RodBar length={piece.length} showNumber={showNumber} className="shadow-sm" />
    </div>
  );
}

/** Área «Experimenta»: mesa libre para comparar regletas sin afectar la construcción. */
export function TestingArea({ pieces, onRemovePiece, onClose, showNumber, onSelectedDrop, hasSelected }: { pieces: TestAreaPiece[]; onRemovePiece: (id: string, len: number) => void; onClose: () => void; showNumber: boolean; onSelectedDrop: () => void; hasSelected: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'testing-area' });
  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-3 top-3 z-20 flex flex-col rounded-xl border border-accent/40 bg-white/95 shadow-lg backdrop-blur-sm sm:inset-x-auto sm:right-3 sm:w-[min(58%,420px)]" data-testid="testing-area">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-900 font-title"><FlaskConical size={14} className="text-accent" />Experimenta</span>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar Experimenta"><X size={15} /></button>
      </div>
      <div ref={setNodeRef} onClick={() => hasSelected && onSelectedDrop()} data-testid="testing-surface" className={`relative m-2 flex-1 overflow-hidden rounded-lg border border-dashed transition ${isOver ? 'border-brand-400 bg-brand-50' : 'border-slate-300 bg-slate-50'}`}>
        {pieces.length === 0 && <p className="micro pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">Arrastra regletas aquí para compararlas. No afecta tu construcción.</p>}
        {pieces.map((p) => <TestPiece key={p.id} piece={p} onRemove={onRemovePiece} showNumber={showNumber} />)}
      </div>
    </div>
  );
}

export { ROD_CONFIG };
