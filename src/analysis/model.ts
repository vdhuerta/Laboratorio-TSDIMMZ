import { INDICATORS } from '../config';
import { computeIndicators, computeStats, indicesOf, type Board, type HistoryEvent } from '../lib/metrics';
import type { AnalysisModel, AppAnalysisConfig, Verdict } from './standard';
import { TSD_ANALYSIS } from './tsdConfig';

export const verdictA = (v: number | null): Verdict => v === null
  ? { status: 'Sin evidencia suficiente', desc: 'Aún no se registran acciones suficientes en la simulación para evaluar el monitoreo metacognitivo.' }
  : v >= 80 ? { status: 'Monitoreo metacognitivo maduro', desc: 'La estudiante supervisa activamente su comprensión durante el proceso, detecta errores mediante la retroalimentación del milieu y ajusta sus estrategias en tiempo real. El ciclo autocontrol → auto-observación → ajuste opera de manera fluida y autónoma.' }
  : v >= 50 ? { status: 'Monitoreo metacognitivo en desarrollo', desc: 'La estudiante muestra indicios de supervisión consciente de su aprendizaje, pero alterna entre momentos de monitoreo reflexivo y episodios de respuesta impulsiva. Se recomienda fortalecer las pausas de autodiagnóstico antes de cada decisión.' }
  : { status: 'Monitoreo metacognitivo inicial', desc: 'Predomina un enfoque de ensayo y error sin supervisión consciente. La estudiante no aprovecha la retroalimentación inmediata para ajustar sus estrategias, lo que indica que el monitoreo metacognitivo requiere andamiaje externo deliberado.' };

export const verdictB = (v: number | null): Verdict => v === null
  ? { status: 'Sin evidencia suficiente', desc: 'Aún no se registran acciones suficientes en la simulación para evaluar la competencia didáctica TSD.' }
  : v >= 80 ? { status: 'Dominio didáctico maduro', desc: 'La estudiante demuestra comprensión sólida de la secuencia adidáctica de Brousseau, respetando el tiempo didáctico, argumentando racionalmente y distinguiendo con claridad las fases de acción, formulación, validación e institucionalización.' }
  : v >= 50 ? { status: 'Dominio didáctico en desarrollo', desc: 'Se observa comprensión parcial de la estructura adidáctica. La estudiante reconoce las fases pero presenta confusiones en los límites entre ellas, especialmente entre acción y formulación o entre validación e institucionalización.' }
  : { status: 'Dominio didáctico inicial', desc: 'Dificultad para distinguir las fases de la TSD. Se observan deslizamientos metadidácticos frecuentes y tendencia a la institucionalización prematura del saber.' };

export const globalVerdict = (v: number | null) => (v === null ? 'Sin evidencia suficiente' : v >= 80 ? 'Autorregulación y Dominio Maduros' : v >= 50 ? 'Nivel en Desarrollo' : 'Nivel Inicial / En Construcción');

export function buildAnalysisModel(history: HistoryEvent[], board: Board, cfg: AppAnalysisConfig = TSD_ANALYSIS): AnalysisModel {
  const raw = computeIndicators(history, board);
  const idx = indicesOf(raw);
  const st = computeStats(history, board);
  const indicators = INDICATORS.map((d) => {
    const r = raw.find((x) => x.code === d.id)!; const m = cfg.indicators[d.id];
    return { ...m, code: d.id, dimension: d.dimension, subdimension: d.sub === 'IDCD' ? null : (d.sub as 'AO' | 'AC'), value: r.value, hasEvidence: r.value !== null, formula: r.formula, feedback: r.value === null ? 'Sin evidencia registrada en esta sesión.' : r.feedback, n: r.denominator,
      breakdown: d.id === 'IM4' && r.denominator > 0 ? `${r.numerator} de ${r.denominator} tarjetas con devolución consultada` : undefined };
  });
  return { cfg, indicators, raw, appropriation: { value: st.appropriation, accuracy: st.accuracy, efficiency: st.efficiency, reflectionFactor: st.reflectionFactor, hasEvidence: st.hasEvidence },
    immz: idx.immz, immzAO: idx.immzAO, immzAC: idx.immzAC, idcd: idx.idcd, immg: idx.immg, verdictA: verdictA(idx.immz), verdictB: verdictB(idx.idcd), verdictGlobal: globalVerdict(idx.immg) };
}
