import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import type { ImmzCategory } from '../types';

export function Modal({ open, onClose, title, children, size = 'lg', tone = 'ink' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'lg' | '3xl' | '5xl'; tone?: 'ink' | 'amber' }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className={`card relative max-h-[90vh] w-full overflow-y-auto bg-white p-6 ${{ lg: 'max-w-lg', '3xl': 'max-w-3xl', '5xl': 'max-w-5xl' }[size]}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className={`text-lg ${tone === 'amber' ? 'text-amber-700' : 'text-slate-900'}`}>{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>
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
