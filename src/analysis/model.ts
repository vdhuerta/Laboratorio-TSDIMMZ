import { INDICATORS } from '../config';
import type { Snapshot } from '../labTypes';
import { computeIndicators, computeStats, indicesOf } from '../lib/metrics';
import type { AnalysisModel, AppAnalysisConfig, Verdict } from './standard';
import { LAB_ANALYSIS } from './labConfig';

export const verdictA = (v: number | null): Verdict => v === null
  ? { status: 'Sin evidencia suficiente', desc: 'Aún no se registran acciones suficientes en el laboratorio para evaluar el monitoreo metacognitivo.' }
  : v >= 80 ? { status: 'Monitoreo metacognitivo maduro', desc: 'La estudiante supervisa activamente su comprensión durante el proceso, detecta errores mediante la retroalimentación del medio y ajusta sus estrategias en tiempo real. El ciclo autocontrol → auto-observación → ajuste opera de manera fluida y autónoma.' }
  : v >= 50 ? { status: 'Monitoreo metacognitivo en desarrollo', desc: 'La estudiante muestra indicios de supervisión consciente de su aprendizaje, pero alterna entre momentos de monitoreo reflexivo y episodios de respuesta impulsiva. Se recomienda fortalecer las pausas de autodiagnóstico antes de cada decisión.' }
  : { status: 'Monitoreo metacognitivo inicial', desc: 'Predomina un enfoque de ensayo y error sin supervisión consciente. La estudiante no aprovecha la retroalimentación inmediata para ajustar sus estrategias, lo que indica que el monitoreo metacognitivo requiere andamiaje externo deliberado.' };

export const verdictB = (v: number | null): Verdict => v === null
  ? { status: 'Sin evidencia suficiente', desc: 'Aún no se registran acciones suficientes en el laboratorio para evaluar la competencia didáctico-disciplinar.' }
  : v >= 80 ? { status: 'Dominio didáctico maduro', desc: 'La estudiante demuestra comprensión sólida de la secuencia adidáctica de Brousseau: actúa sobre el medio antes de formular, argumenta con racionalidad la composición y descomposición aditiva y convierte con soltura entre el registro de las regletas y el registro numérico (Duval).' }
  : v >= 50 ? { status: 'Dominio didáctico en desarrollo', desc: 'Se observa comprensión parcial de la estructura adidáctica. La estudiante construye con lógica, pero presenta saltos entre acción y formulación o dificultades para convertir lo construido en una explicación general de la regularidad.' }
  : { status: 'Dominio didáctico inicial', desc: 'Dificultad para sostener la secuencia de la situación. Se observan ensayos sin anticipación, ayudas solicitadas antes de actuar y formulaciones breves o ausentes sobre la descomposición numérica.' };

export const globalVerdict = (v: number | null) => (v === null ? 'Sin evidencia suficiente' : v >= 80 ? 'Autorregulación y Dominio Maduros' : v >= 50 ? 'Nivel en Desarrollo' : 'Nivel Inicial / En Construcción');

export function buildAnalysisModel(snap: Snapshot, cfg: AppAnalysisConfig = LAB_ANALYSIS): AnalysisModel {
  const raw = computeIndicators(snap);
  const idx = indicesOf(raw);
  const st = computeStats(snap);
  const indicators = INDICATORS.map((d) => {
    const r = raw.find((x) => x.code === d.id)!; const m = cfg.indicators[d.id];
    return { ...m, code: d.id, dimension: d.dimension, subdimension: d.sub === 'IDCD' ? null : (d.sub as 'AO' | 'AC'), value: r.value, hasEvidence: r.value !== null, formula: r.formula, feedback: r.value === null ? 'Sin evidencia registrada en esta sesión.' : r.feedback, n: r.denominator,
      breakdown: d.id === 'IM4' && r.denominator > 0 ? `${r.numerator} de ${r.denominator} devoluciones seguidas de un reajuste` : d.id === 'IM10' && r.denominator > 0 ? `${r.numerator} de ${r.denominator} preguntas con respuesta sustantiva` : undefined };
  });
  return { cfg, indicators, raw, appropriation: { value: st.appropriation, accuracy: st.accuracy, efficiency: st.efficiency, reflectionFactor: st.reflectionFactor, hasEvidence: st.hasEvidence },
    immz: idx.immz, immzAO: idx.immzAO, immzAC: idx.immzAC, idcd: idx.idcd, immg: idx.immg, verdictA: verdictA(idx.immz), verdictB: verdictB(idx.idcd), verdictGlobal: globalVerdict(idx.immg) };
}
