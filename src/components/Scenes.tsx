import { HOUSE_IMAGE, LANE_COUNT, TSD3_SIDES, isLaneCorrect, isLaneWrong, realTarget, sideOf, visualCapacity, BG_IMAGES } from '../data/lab';
import type { ActivityKey, LabConfig, RodInstance } from '../labTypes';
import { LaneView } from './Rods';

interface SceneProps {
  act: ActivityKey; lanes: RodInstance[][]; cfg: LabConfig; showCounter: boolean; showNumber: boolean; placeMode: boolean; reveal: boolean;
  onRemove: (idx: number, rodId: string, length: number) => void; onPlaceSelected: (idx: number) => void;
}

/** Escenario de la actividad activa: escalera (TSD 1), vías del puente (TSD 2) o perímetro de la casa (TSD 3). */
export default function Scene({ act, lanes, cfg, showCounter, showNumber, placeMode, reveal, onRemove, onPlaceSelected }: SceneProps) {
  const mk = (idx: number, orientation: 'h' | 'v', extra: { align?: 'start' | 'end'; label?: string } = {}) => {
    const lane = lanes[idx] ?? []; const lens = lane.map((r) => r.length);
    return <LaneView key={idx} idx={idx} lane={lane} capacity={visualCapacity(act, idx, cfg)} target={realTarget(act, idx, cfg)} orientation={orientation}
      correct={isLaneCorrect(act, idx, lens, cfg)} wrong={isLaneWrong(act, idx, lens, cfg)} showCounter={showCounter} showNumber={showNumber} placeMode={placeMode} reveal={reveal}
      onRemove={(id, len) => onRemove(idx, id, len)} onPlaceSelected={() => onPlaceSelected(idx)} align={extra.align} label={extra.label} />;
  };
  const bg = BG_IMAGES[act];

  const help = <p className="micro absolute inset-x-0 bottom-1.5 z-10 mx-auto w-fit max-w-full rounded-md bg-white/80 px-2 py-0.5 text-center !text-[9px]" data-testid="scene-help">Arrastra regletas a cada carril · clic en una regleta puesta para quitarla (sin regleta elegida)</p>;
  if (act === 'TSD1') return (
    <div className="flex flex-1 justify-center overflow-hidden rounded-xl border border-slate-200 bg-white" data-testid="scene-TSD1">
      <div className="relative aspect-[1415/823] min-h-[480px] w-full bg-cover bg-bottom bg-no-repeat" style={{ backgroundImage: `url("${bg}")` }}>
        <div className="absolute bottom-[9%] right-[28.5%] z-10 flex flex-col items-end gap-[3px]" data-testid="stairs">{Array.from({ length: LANE_COUNT.TSD1 }, (_, i) => mk(i, 'h', { align: 'end', label: `Escalón ${i + 1}` }))}</div>
        {help}
      </div>
    </div>);
  if (act === 'TSD2') return (
    <div className="flex flex-1 justify-center overflow-hidden rounded-xl border border-slate-200 bg-white" data-testid="scene-TSD2">
      <div className="relative aspect-[640/580] min-h-[520px] w-full max-w-[640px] bg-cover bg-bottom bg-no-repeat" style={{ backgroundImage: `url("${bg}")` }}>
        <div className="absolute inset-x-0 bottom-[12.5%] z-10 flex items-end justify-center gap-5" data-testid="bridge">{Array.from({ length: LANE_COUNT.TSD2 }, (_, i) => (
          <div key={i} className="relative">{mk(i, 'v', { label: `Vía ${i + 1}` })}<span className="micro absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-md border border-slate-200 bg-white/90 px-1.5 py-0.5 !text-[9px]">V{i + 1}</span></div>))}</div>
        {help}
      </div>
    </div>);
  const clues = <p className="micro absolute inset-x-0 bottom-6 z-10 mx-auto w-fit max-w-[95%] rounded-md bg-white/80 px-2 py-0.5 text-center !text-[10px]" data-testid="scene-clues">{sideOf(3).label}: «{sideOf(3).clue}» · {sideOf(0).label}: «{sideOf(0).clue}» · {sideOf(1).label}: «{sideOf(1).clue}» · {sideOf(2).label}: «{sideOf(2).clue}»</p>;
  return (
    <div className="flex flex-1 justify-center overflow-hidden rounded-xl border border-slate-200 bg-white" data-testid={`scene-${act}`}>
      <div className="relative flex min-h-[620px] w-full items-center justify-center bg-no-repeat" style={{ backgroundImage: `url("${HOUSE_IMAGE}")`, backgroundSize: '11rem', backgroundPosition: 'center' }}>
        <div className="relative z-10 h-[400px] w-[400px]" data-testid="fence">
          {['left-0 top-0', 'right-0 top-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((p) => <div key={p} className={`absolute ${p} z-20 h-[34px] w-[34px] rounded border-2 border-white bg-black shadow-md`} title="Pilar" />)}
          {TSD3_SIDES.map((s) => {
            const pos = s.idx === 3 ? 'left-0 top-[34px]' : s.idx === 0 ? 'left-[34px] top-0' : s.idx === 1 ? 'right-0 top-[34px]' : 'bottom-0 left-[34px]';
            const lab = s.idx === 3 ? 'left-[-52px] top-1/2 -translate-y-1/2' : s.idx === 1 ? 'right-[-52px] top-1/2 -translate-y-1/2' : s.idx === 0 ? 'left-1/2 top-[-30px] -translate-x-1/2' : 'bottom-[-30px] left-1/2 -translate-x-1/2';
            const horizontal = s.idx === 0 || s.idx === 2;
            return (
              <div key={s.idx} className={`absolute ${pos}`}>
                <span className={`pill pointer-events-none absolute z-10 whitespace-nowrap border-accent/40 bg-white !py-0 text-[11px] text-accent font-title ${lab}`} data-testid={`side-${s.label}`}>{s.label}</span>
                {mk(s.idx, horizontal ? 'h' : 'v', { label: s.name })}
              </div>);
          })}
        </div>
        {clues}
        {help}
      </div>
    </div>
  );
}
