import { type ReactNode, useEffect } from 'react';
import { Lock, X } from 'lucide-react';
import type { ImmzCategory } from '../types';

export function Modal({ open, onClose, title, children, size = 'lg', tone = 'ink', locked = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'lg' | '3xl' | '5xl'; tone?: 'ink' | 'amber'; /** Bloqueante: sin X, sin Esc y sin cerrar al hacer clic fuera. */ locked?: boolean }) {
  useEffect(() => {
    if (!open || locked) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [open, onClose, locked]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={locked ? undefined : onClose} />
      <div role="dialog" aria-modal="true" className={`card relative max-h-[90vh] w-full overflow-y-auto bg-white p-6 ${{ lg: 'max-w-lg', '3xl': 'max-w-3xl', '5xl': 'max-w-5xl' }[size]}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className={`text-lg ${tone === 'amber' ? 'text-amber-700' : 'text-slate-900'}`}>{title}</h3>
          {!locked && <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>}
        </div>
        {children}
      </div>
    </div>
  );
}

export const catStyle: Record<ImmzCategory, string> = {
  Inicial: 'bg-rose-50 text-rose-700 border-rose-200',
  'En Desarrollo': 'bg-amber-50 text-amber-700 border-amber-200',
  Competente: 'bg-sky-50 text-sky-700 border-sky-200',
  Avanzado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
export function CatBadge({ cat }: { cat: ImmzCategory | null }) {
  if (!cat) return <span className="pill border-slate-200 bg-slate-50 text-slate-500">Sin evidencia</span>;
  return <span className={`pill ${catStyle[cat]}`}>{cat}</span>;
}
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl text-slate-900">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
      {action}
    </div>
  );
}
export const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v)}%`);

/** Globo informativo con el estilo de la app (se muestra al pasar el mouse o con el foco). Solo se activa si `lines` trae contenido. */
export function Tip({ title, lines, children, className = '', side = 'bottom' }: { title: string; lines: string[]; children: ReactNode; className?: string; side?: 'bottom' | 'top' }) {
  if (!lines.length) return <>{children}</>;
  return (
    <span className={`group relative ${className}`}>
      {children}
      <span role="tooltip" data-testid="app-tip" className={`pointer-events-none invisible absolute left-1/2 z-[80] w-64 -translate-x-1/2 rounded-xl border border-accent/40 bg-white p-3 text-left opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
        <span className="micro mb-1.5 flex items-center gap-1.5 !text-amber-700"><Lock size={11} />{title}</span>
        {lines.map((l) => <span key={l} className="mb-1 block text-[11px] normal-case leading-snug tracking-normal text-slate-700 last:mb-0">{l}</span>)}
      </span>
    </span>
  );
}
