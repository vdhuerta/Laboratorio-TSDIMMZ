import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { APP_META } from '../config';

/** Misma barra superior del Diario de Campo: franja de marca, logotipo con esquina de acento y título. */
export default function AppHeader({ left, children }: { left?: ReactNode; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 flex h-[58px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 shadow-[0_16px_28px_-16px_rgba(15,23,42,0.35)]">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-brand-500" />
      <div className="flex min-w-0 items-center gap-3 pl-2">
        {left}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
          <BookOpen size={16} /><span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-bl-md bg-accent" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="micro !text-[9px] tracking-widest">Teoría de las Situaciones Didácticas</p>
          <h1 className="truncate text-sm text-slate-900">{APP_META.name} · {APP_META.scenarioName}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
