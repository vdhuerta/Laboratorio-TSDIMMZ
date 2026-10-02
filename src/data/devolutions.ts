import type { ActivityKey, LabEvent } from '../labTypes';

/**
 * DEVOLUCIONES DIDÁCTICAS DE LA CONSTRUCCIÓN (TSD 1, 2 y 3)
 * Se piden a voluntad del participante y se gradúan en 3 niveles. Ninguna entrega la medida ni la respuesta:
 * formulan preguntas y orientan hacia el medio (comparar, medir, usar Experimenta) para evitar el efecto Topaze.
 * `{lane}` se reemplaza por el nombre del carril observado (Escalón 4, Vía 2, Lado L3…).
 */
export type DevCase = 'inicio' | 'error' | 'incompleto' | 'completa';

export const DEV_CASE_LABEL: Record<DevCase, string> = {
  inicio: 'Punto de partida', error: 'Una pieza no corresponde', incompleto: 'Construcción en curso', completa: 'Construcción completa',
};

export const DEV_TEXT: Record<ActivityKey, Record<DevCase, [string, string, string]>> = {
  TSD1: {
    inicio: [
      'Antes de colocar regletas, mira la escalera de abajo hacia arriba: ¿qué cambia de un escalón al siguiente?',
      'Toma una regleta cualquiera y compárala con el escalón de más abajo. ¿Cuántas veces cabe? Puedes probarlo en Experimenta.',
      'Piensa en la regleta más pequeña como una unidad de medida: ¿cómo la usarías para comparar el escalón de más abajo con el que está justo encima?',
    ],
    error: [
      'Observa el {lane}: compara su largo con el del escalón que está justo debajo (o justo encima). ¿Qué diferencia hay entre ambos?',
      'Si, al subir de un escalón al siguiente, el largo cambia siempre en la misma cantidad, ¿tu {lane} sigue esa regla? Compruébalo con una regleta en Experimenta.',
      'Retira piezas del {lane} y vuelve a armarlo, midiendo cuánto cambia su largo respecto del escalón que está justo debajo. Esa regla de cambio es la misma en toda la escalera.',
    ],
    incompleto: [
      'El {lane} aún no está listo. ¿Cómo podrías averiguar cuánto le falta o le sobra comparándolo con el escalón vecino?',
      'Mira un escalón ya resuelto y pregúntate: ¿cuánto más largo o más corto debería ser este, según el lugar que ocupa en la escalera?',
      'En Experimenta, junta dos regletas y compáralas con una tercera. ¿Qué combinaciones igualan el largo que necesitas?',
    ],
    completa: [
      'Tus escalones forman una regularidad. ¿Podrías describirla sin contar de uno en uno?',
      'Elige dos escalones cualesquiera y compáralos. ¿La relación se mantiene en todos?',
      'Estás listo para poner en palabras lo que descubriste: abre «Formulación» y responde con tus propias palabras.',
    ],
  },
  TSD2: {
    inicio: [
      'Cada vía debe cubrirse exactamente. ¿Qué te dice el largo de la vía sobre lo que debes colocar? Compara con una regleta en Experimenta.',
      '¿Existe una regleta que cubra una vía por sí sola? ¿Y si usas dos regletas?',
      'Una misma vía puede cubrirse de varias maneras: busca dos regletas que juntas igualen el largo de otra.',
    ],
    error: [
      'En la {lane} hay una pieza que no corresponde. ¿Qué ocurre con el largo total cuando agregas una regleta más?',
      'Compara lo que colocaste con el largo de la vía: ¿sobra o falta? ¿Qué regleta, más corta o más larga, ajustaría la medida?',
      'Retira la última pieza y observa el espacio libre que queda: ¿qué regleta ocupa exactamente ese espacio?',
    ],
    incompleto: [
      'La {lane} aún tiene espacio sin cubrir. ¿Cuánto espacio queda? Mídelo con una regleta en Experimenta.',
      'Busca una regleta, o dos, que completen justo el espacio libre.',
      'Descompón el espacio libre: ¿qué dos regletas juntas lo igualan? ¿Habría otra pareja que también sirva?',
    ],
    completa: [
      'Las vías están cubiertas. ¿Las armaste todas de la misma manera?',
      '¿Qué otra combinación de regletas serviría para cubrir una de las vías?',
      'Pon en palabras lo que descubriste sobre descomponer un largo: abre «Anclaje» y escríbelo.',
    ],
  },
  TSD3: {
    inicio: [
      'Cada lado tiene una pista escrita. Léela con calma: ¿qué operación te pide realizar?',
      'Traduce la pista a una operación con números y calcúlala antes de colocar piezas.',
      'Cuando tengas el resultado de la pista, busca regletas que juntas igualen ese resultado.',
    ],
    error: [
      'Relee la pista del {lane}: ¿lo que construiste dice lo mismo que la pista?',
      'Escribe la operación de la pista paso a paso (qué se multiplica o qué se suma primero) y compara con lo que armaste.',
      'Calcula el valor de la pista del {lane} y ajusta las piezas hasta que su suma coincida con ese valor.',
    ],
    incompleto: [
      'El {lane} todavía no cumple su pista. ¿Qué le falta para igualarla?',
      'Calcula de nuevo lo que pide la pista y compáralo con la suma de tus regletas.',
      'Prueba en Experimenta una combinación distinta de regletas para lograr ese resultado.',
    ],
    completa: [
      'Cada lado cumple su pista. ¿Notas algo en común entre los cuatro resultados?',
      '¿Qué pasa con el perímetro total de la cerca? ¿Cómo lo explicarías?',
      'Pon en palabras tu estrategia: abre «Anclaje» y escribe cómo pasaste de la pista a las regletas.',
    ],
  },
};

export interface DevSituation { case: DevCase; laneIndex?: number; key: string }
export const devKey = (act: ActivityKey, c: DevCase, lane?: number) => `${act}:${c}:${lane ?? '*'}`;

/** Cuántas devoluciones de construcción lleva cada situación (derivado de la traza: nunca se desincroniza). */
export function devLevels(history: LabEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  history.forEach((e) => { if (e.type === 'devolution_request' && e.payload?.scope === 'construction') { const k = String(e.payload.key); out[k] = Math.max(out[k] ?? 0, e.devolutionLevel ?? 0); } });
  return out;
}
