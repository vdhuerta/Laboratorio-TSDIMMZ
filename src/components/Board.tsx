import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, CheckCircle2, Layout, Search, Undo2 } from 'lucide-react';
import { PHASES_CONFIG, PHASE_TONES, type Card, type TSDPhase } from '../data/cards';

const TYPE_STYLE: Record<Card['type'], string> = {
  Consigna: 'bg-rose-50 text-rose-700 border-rose-100',
  Material: 'bg-sky-50 text-sky-700 border-sky-100',
  'Rol Docente': 'bg-indigo-50 text-indigo-700 border-indigo-100',
  'Pregunta Guía': 'bg-violet-50 text-violet-700 border-violet-100',
};

export function DraggableCard({ card, isOverlay = false, isCorrect = null, showSolution = false, onAnalysis }: { card: Card; isOverlay?: boolean; isCorrect?: boolean | null; showSolution?: boolean; onAnalysis?: (c: Card) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const border = isCorrect === true ? 'border-emerald-500' : isCorrect === false ? 'border-rose-400' : 'border-slate-200';
  return (
    <div ref={setNodeRef} data-card-id={card.id} style={{ transform: CSS.Transform.toString(transform), transition: transition || 'transform 200ms cubic-bezier(0.2,0,0,1)', opacity: isDragging ? 0.4 : 1, touchAction: 'none' }} {...attributes} {...listeners}
      className={`card mb-2.5 select-none border bg-white p-3 ${border} ${isOverlay ? 'z-50 rotate-1 scale-105 shadow-lg' : 'cursor-grab transition hover:shadow-sm active:cursor-grabbing'}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`pill !px-2 !py-0 text-[10px] uppercase tracking-wider ${TYPE_STYLE[card.type]}`}>{card.type}</span>
        <div className="flex items-center gap-1.5">
          {onAnalysis && (
            <span className="group/tip relative">
              <button data-analysis-btn onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onAnalysis(card); }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-brand-500 focus-visible:bg-brand-50 focus-visible:text-brand-500" aria-label="Ver la Devolución Didáctica de esta tarjeta"><Search size={15} /></button>
              <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 z-30 mb-1.5 w-max max-w-[210px] rounded-lg bg-brand-500 px-2.5 py-1.5 text-left text-[11px] leading-snug text-white opacity-0 shadow-lg transition group-hover/tip:opacity-100 group-focus-within/tip:opacity-100">
                Usa la lupa para mirar la Devolución Didáctica de esta tarjeta
                <i className="absolute right-3 top-full h-0 w-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-brand-500" />
              </span>
            </span>
          )}
          {isCorrect === true && <CheckCircle2 size={14} className="text-emerald-600" />}
          {isCorrect === false && <AlertCircle size={14} className="text-rose-500" />}
          {showSolution && isCorrect === null && <span className="pill !px-1.5 !py-0 text-[10px] uppercase text-brand-500">{card.correctPhase.slice(0, 3)}</span>}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-900">{card.content}</p>
    </div>
  );
}

export function DropZone({ id, cards, verifying, showSolutions, onAnalysis }: { id: TSDPhase; cards: Card[]; verifying: boolean; showSolutions: boolean; onAnalysis: (c: Card) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const cfg = PHASES_CONFIG[id]; const tone = PHASE_TONES[cfg.tone];
  return (
    <div ref={setNodeRef} data-zone={id} className={`card min-h-[250px] p-4 transition ${isOver ? 'border-brand-300 bg-brand-50' : ''}`}>
      <div className="mb-3">
        <header className="mb-1 flex items-center justify-between">
          <span className={`flex items-center gap-2 text-xs uppercase tracking-widest font-title ${tone.text}`}><i className={`h-2 w-2 rounded-full ${tone.dot}`} />{cfg.title}</span>
          <span className="pill !py-0 text-[10px] text-slate-500">{cards.length}</span>
        </header>
        <p className="micro !normal-case !tracking-normal">{cfg.description.split('.')[0]}.</p>
      </div>
      <div className="flex min-h-[120px] flex-col justify-center rounded-xl bg-slate-50 p-1.5">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length ? cards.map((c) => <DraggableCard key={c.id} card={c} isCorrect={verifying || showSolutions ? c.correctPhase === id : null} showSolution={showSolutions} onAnalysis={onAnalysis} />)
            : <div className="flex flex-col items-center py-6 opacity-30"><Layout size={22} className="mb-1" /><p className="micro">Milieu</p></div>}
        </SortableContext>
      </div>
    </div>
  );
}

export function AvailableDeck({ cards, showSolutions }: { cards: Card[]; showSolutions: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'available' });
  return (
    <div ref={setNodeRef} data-zone="available" className="min-h-[80px] flex-1 overflow-y-auto pr-1 pb-4">
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {cards.length ? cards.map((c) => <DraggableCard key={c.id} card={c} showSolution={showSolutions} />)
          : <div data-testid="deck-empty" className={`flex min-h-[150px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${isOver ? 'border-brand-500 bg-brand-50' : 'border-brand-300 bg-white/60'}`}><Undo2 size={26} className="mb-2 text-brand-400" /><p className="text-xs uppercase tracking-wider text-brand-500 font-title">Mazo vacío</p><p className="mt-1 text-xs leading-snug text-slate-500">Todas las tarjetas están ubicadas. Si quieres reconsiderar una decisión, arrastra una tarjeta hasta aquí para devolverla al mazo.</p></div>}
      </SortableContext>
    </div>
  );
}
