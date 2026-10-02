import type { ActivityKey, LabConfig } from '../labTypes';
import volantinImg from '../assets/volantin.png';
import castilloImg from '../assets/castillo.png';
import headerImg from '../assets/header.jpg';
import houseImg from '../assets/home.png';

/* ───────────── Regletas Cuisenaire ───────────── */
export interface RodDef { length: number; color: string; code: string; name: string; text: string; border: string }
export const ROD_CONFIG: RodDef[] = [
  { length: 1, color: '#FFFFFF', code: 'B', name: 'Blanca', text: '#334155', border: '#cbd5e1' },
  { length: 2, color: '#E53935', code: 'R', name: 'Roja', text: '#FFFFFF', border: '#b91c1c' },
  { length: 3, color: '#8BC34A', code: 'V', name: 'Verde Claro', text: '#1E293B', border: '#65a30d' },
  { length: 4, color: '#F06292', code: 'P', name: 'Rosada', text: '#FFFFFF', border: '#db2777' },
  { length: 5, color: '#FFEB3B', code: 'A', name: 'Amarilla', text: '#1E293B', border: '#ca8a04' },
  { length: 6, color: '#2E7D32', code: 'VO', name: 'Verde Oscuro', text: '#FFFFFF', border: '#15803d' },
  { length: 7, color: '#212121', code: 'N', name: 'Negra', text: '#FFFFFF', border: '#000000' },
  { length: 8, color: '#795548', code: 'C', name: 'Café', text: '#FFFFFF', border: '#5d4037' },
  { length: 9, color: '#1E88E5', code: 'Az', name: 'Azul', text: '#FFFFFF', border: '#1d4ed8' },
  { length: 10, color: '#FB8C00', code: 'Na', name: 'Naranja', text: '#FFFFFF', border: '#c2410c' },
];
export const rodOf = (length: number) => ROD_CONFIG.find((r) => r.length === length);
export const UNIT_SIZE = 28;
export const ROD_WIDTH = 28;

/* ───────────── Actividades y reglas de validación ───────────── */
export const ACTIVITIES: ActivityKey[] = ['TSD1', 'TSD2', 'TSD3'];
export const LANE_COUNT: Record<ActivityKey, number> = { TSD1: 10, TSD2: 4, TSD3: 4 };
export const TOTAL_LANES = 18;
export const TSD1_VISUAL_CAPACITY = 11; // largo visual de cada escalón (no revela la meta real de cada uno)
export const TSD3_TOTAL = 12;

export const ACTIVITY_META: Record<ActivityKey, { short: string; name: string; scene: string; color: string }> = {
  TSD1: { short: 'TSD 1 (Volantín)', name: 'El Volantín', scene: 'La Escalera', color: 'sky' },
  TSD2: { short: 'TSD 2 (Puente)', name: 'El Puente', scene: 'Las 4 vías del puente', color: 'brand' },
  TSD3: { short: 'TSD 3 (Cerca)', name: 'La Cerca', scene: 'El perímetro de la casa', color: 'amber' },
};

/** Lados de la cerca. `idx` es el índice del carril (se conserva el de la app original). */
export const TSD3_SIDES = [
  { idx: 3, label: 'L1', name: 'Lado 1', clue: 'Cuatro veces 3', expr: '3 + 3 + 3 + 3', pattern: [3, 3, 3, 3] },
  { idx: 0, label: 'L2', name: 'Lado 2', clue: '2n+2', expr: '2 + 5 + 5', pattern: [2, 5, 5] },
  { idx: 1, label: 'L3', name: 'Lado 3', clue: 'Doble de 4 más 4', expr: '8 + 4', pattern: [4, 8] },
  { idx: 2, label: 'L4', name: 'Lado 4', clue: 'Dos grupos de seis', expr: '6 + 6', pattern: [6, 6] },
] as const;
/** Escalón n de la escalera contado DESDE ABAJO (el carril interno 0 es el de arriba). */
export const stairNumber = (idx: number) => LANE_COUNT.TSD1 - idx;
export const sideOf = (idx: number) => TSD3_SIDES.find((s) => s.idx === idx)!;

/** Meta real del carril (lo que debe sumar para estar correcto). */
export const realTarget = (act: ActivityKey, idx: number, cfg: LabConfig) => (act === 'TSD1' ? idx + 1 : act === 'TSD2' ? cfg.targetUnits : TSD3_TOTAL);
/** Capacidad visual del carril (lo que cabe físicamente). En TSD 1 todos los escalones miden lo mismo para no dar la respuesta. */
export const visualCapacity = (act: ActivityKey, idx: number, cfg: LabConfig) => (act === 'TSD1' ? TSD1_VISUAL_CAPACITY : realTarget(act, idx, cfg));

const sum = (ls: number[]) => ls.reduce((s, l) => s + l, 0);
const sameSorted = (a: number[], b: readonly number[]) => a.length === b.length && [...a].sort((x, y) => x - y).every((v, i) => v === b[i]);

export function isLaneCorrect(act: ActivityKey, idx: number, lengths: number[], cfg: LabConfig): boolean {
  const total = sum(lengths);
  if (act === 'TSD1') return total === idx + 1;
  if (act === 'TSD2') return total === cfg.targetUnits;
  if (total !== TSD3_TOTAL) return false;
  const side = TSD3_SIDES.find((s) => s.idx === idx);
  return side ? sameSorted(lengths, side.pattern) : true;
}
/** TSD 3: el lado llegó a 12 pero con una composición que no corresponde a la pista. */
export const isLaneWrong = (act: ActivityKey, idx: number, lengths: number[], cfg: LabConfig) => act === 'TSD3' && sum(lengths) >= TSD3_TOTAL && !isLaneCorrect(act, idx, lengths, cfg);

/** Contenedor con piezas que no corresponden (para el «ojo»): TSD 1 y 2 se pasan de la meta; TSD 3 llega a 12 con otra composición. */
export const isLaneFlagged = (act: ActivityKey, idx: number, lengths: number[], cfg: LabConfig) => (act === 'TSD3' ? isLaneWrong(act, idx, lengths, cfg) : sum(lengths) > realTarget(act, idx, cfg));

/* ───────────── Formulación (TSD 1) y anclajes (TSD 2 y 3) ───────────── */
export interface QuestionConfig { id: number; title: string; subhead: string; enunciado: string; devoluciones: string[]; unlockConditionText: string }
export const FORMULATION_QUESTIONS: QuestionConfig[] = [
  { id: 1, title: 'Pregunta 1', subhead: 'Observación de la regularidad',
    enunciado: 'Observa la escalera que construiste. Recórrela de abajo hacia arriba: ¿qué cambia cuando pasas de un escalón al siguiente? Descríbelo con tus palabras.',
    devoluciones: ['Elige dos escalones que estén uno al lado del otro y compáralos. ¿En qué se parecen y en qué se diferencian?', 'En el área de experimentación, coloca regletas sobre la diferencia entre esos dos escalones hasta cubrirla exactamente. ¿Qué encuentras?', 'Repite lo que hiciste en otra parte de la escalera, con dos escalones distintos. ¿Ocurre lo mismo?'],
    unlockConditionText: 'Se habilita cuando hay al menos 5 carriles correctos en la escalera.' },
  { id: 2, title: 'Pregunta 2', subhead: 'Búsqueda de una medida común',
    enunciado: '¿Con cuál de las regletas podrías cubrir exactamente todas las demás? Compruébalo en el área de experimentación y describe lo que encontraste.',
    devoluciones: ['Toma una regleta de color y trata de cubrirla exactamente con varias copias de otra regleta más corta. Prueba con distintas combinaciones.', 'Anota con cuáles lo lograste y con cuáles no. ¿Hay alguna que te sirva para todas?', '¿Existe alguna regleta que no puedas cubrir con la que elegiste? Búscala. Si no la encuentras, ¿qué te dice eso?'],
    unlockConditionText: 'Se habilita cuando la escalera esté completa (10 escalones correctos).' },
  { id: 3, title: 'Pregunta 3', subhead: 'Del largo al nombre numérico',
    enunciado: 'Si usas la regleta que encontraste para medir, ¿qué nombre le darías a cada una de las otras? Explica en qué te basas para darle ese nombre.',
    devoluciones: ['Vuelve a lo que anotaste en la pregunta anterior. ¿Ese resultado te sirve para nombrar cada regleta?', 'Escribe el nombre que le darías a tres regletas distintas y compáralo con la posición que ocupan en la escalera. ¿Coinciden?', '¿Podrían dos regletas distintas recibir el mismo nombre? Compruébalo con el material antes de responder.'],
    unlockConditionText: 'Se habilita al responder la Pregunta 2 por escrito.' },
  { id: 4, title: 'Pregunta 4', subhead: 'La relación entre un escalón y el siguiente',
    enunciado: 'Ya le diste un nombre a cada regleta. Ahora explica cómo se obtiene el escalón que sigue hacia arriba, a partir de cualquier escalón. Escríbelo de manera que le sirva a otra persona para cualquier escalón de la escalera.',
    devoluciones: ['Elige un escalón cualquiera y el que viene después. ¿Qué cambio tendrías que hacerle al primero para obtener el segundo?', 'Comprueba si lo que escribiste también funciona en el otro extremo de la escalera.', '¿Tu explicación serviría para un escalón que todavía no está en la escalera, por ejemplo uno más abajo del primero? Pruébalo.'],
    unlockConditionText: 'Se habilita al responder la Pregunta 3 por escrito.' },
];

export interface AnchorConfig { activity: 'TSD2' | 'TSD3'; title: string; subhead: string; enunciado: string; devoluciones: string[]; meta: string; placeholder: string }
export const ANCHOR_CONFIGS: Record<'TSD2' | 'TSD3', AnchorConfig> = {
  TSD2: { activity: 'TSD2', title: 'Anclaje TSD 2 — El Puente', subhead: 'Descomposición Numérica y Composición Aditiva del entero', meta: 'Composición aditiva', placeholder: 'Explica cómo se compone y descompone la medida de la vía usando diferentes partes aditivas...',
    enunciado: 'En esta actividad cada carril o vía del puente debe cubrirse exactamente usando diferentes combinaciones de regletas. ¿Cómo se relaciona lo que descubriste en la escalera con las diferentes formas de descomponer en partes aditivas el número que mide cada vía? Explica tus conclusiones.',
    devoluciones: ['Observa dos vías que hayas completado con diferente cantidad de piezas (por ejemplo, una con 2 regletas y otra con 3 o más). Si ambas alcanzan el mismo largo total (el de la vía), ¿qué relación observas entre el tamaño de cada parte y la cantidad de piezas necesarias? Compruébalo colocando las regletas juntas en la mesa de pruebas.', 'Toma las regletas de una vía válida y cambia el orden en que las colocas. ¿Sigue cubriendo exactamente la vía? Busca si existen combinaciones con las mismas piezas ordenadas distinto y combinaciones con piezas totalmente diferentes. ¿Qué te indica esto sobre cómo se puede componer un mismo número?', 'Si tuvieras que explicarle a un compañero todas las maneras posibles de formar ese número usando regletas más pequeñas, ¿cómo podrías organizar esas sumas o combinaciones para estar seguro de que no te falta ninguna? Escribe tu razonamiento sin dar una sola combinación fija.'] },
  TSD3: { activity: 'TSD3', title: 'Anclaje TSD 3 — La Cerca', subhead: 'Partición del Perímetro y Equivalencia de Medidas en 12', meta: 'Meta: 12 unidades', placeholder: 'Explica qué tienen en común las pistas con la partición del perímetro 12...',
    enunciado: 'En la cerca cada lado tiene una longitud total de 12 unidades, pero cada lado te exige una regla específica (por ejemplo "cuatro veces 3" o "2n+2"). ¿Qué tienen en común estas formas de cercar con la descomposición numérica que trabajaste en el puente y la escalera?',
    devoluciones: ['Compara el lado de "cuatro veces 3" con el lado de "dos grupos de 6". Ambos alcanzan exactamente 12 unidades. ¿Qué diferencia encuentras entre repetir una misma regleta varias veces (iteración) y combinar regletas de distintos tamaños para alcanzar una misma longitud total?', 'En la mesa de pruebas, coloca juntas las regletas de "doble de 4 más 4" y compáralas con las regletas de "2 + 5 + 5". Aunque usan piezas de colores y tamaños muy diferentes, ¿por qué ambas logran cercar la misma distancia? Explica cómo se relacionan las sumas parciales con el total 12.', 'Imagina que agregamos un quinto lado a la cerca que también deba medir 12 unidades. ¿Qué nueva combinación de regletas o qué regla de reparto propondrías que no se haya usado todavía? Justifica tu respuesta usando lo que aprendiste sobre descomponer una longitud.'] },
};

/* ───────────── Textos de cada actividad ───────────── */
export const INTRO: Record<ActivityKey, { kicker: string; hook: string; story: string; goal: string; steps: string[]; incomplete: string; success: string; summary: string; scenarioTitle: string; scenarioText: string }> = {
  TSD1: { kicker: 'Operación El Volantín', hook: '¡Ayuda a Pedro a alcanzar el Volantín!', scenarioTitle: 'El Volantín de Pedro',
    story: 'El volantín de Pedro se ha quedado atrapado. Arrastra las regletas para construir una estructura coherente que le permita llegar hasta él.',
    scenarioText: 'Explora las piezas y utilízalas para completar los espacios en blanco de la escalera, de forma que Pedro pueda subir hasta su volantín.',
    goal: 'Explora las piezas y utilízalas para completar los espacios en blanco de la escalera de forma que Pedro pueda subir.',
    steps: ['Explora las piezas en el depósito y arrástralas al espacio de trabajo.', 'Construye la escalera de abajo hacia arriba, empezando por el Escalón 1, y completa los 10 niveles con las regletas correspondientes.', 'Busca una construcción coherente que permita a Pedro subir seguro.', 'Rescata el volantín completando todos los niveles de la escalera.'],
    incomplete: 'Aún faltan escalones para que Pedro pueda subir.', success: '¡VOLANTÍN RESCATADO!', summary: 'Resumen de escalera' },
  TSD2: { kicker: 'Operación Reconstrucción', hook: '¡Nuestros enemigos han derribado el PUENTE del castillo!', scenarioTitle: 'El Puente del Castillo',
    story: 'Para poder cruzar el río y entrar, necesitamos reconstruirlo. Pero atención: no podemos usar piezas al azar, debemos seguir las instrucciones secretas.',
    scenarioText: 'Reconstruye las 4 vías de paso del puente. Cada vía debe medir exactamente el largo indicado, y puedes lograrlo con distintas combinaciones de piezas.',
    goal: 'Reconstruir las 4 vías de paso del puente. Cada vía debe cubrirse exactamente con regletas, y puedes lograrlo con distintas combinaciones de piezas.',
    steps: ['Identifica el tamaño total requerido para reconstruir la vía del puente.', 'Descompón el total de la vía usando diferentes combinaciones de piezas.', 'Asegúrate de completar las 4 vías de paso para asegurar el castillo.', 'Revisa tu obra en el mensaje encriptado y descarga tu reporte desde «Análisis del participante».'],
    incomplete: 'Aún faltan piezas para estabilizar las 4 vías del puente.', success: '¡PUENTE COMPLETADO CON ÉXITO!', summary: 'Plano final de obra' },
  TSD3: { kicker: 'Operación La Cerca', hook: '¡Situación a-didáctica!', scenarioTitle: 'La Cerca de la Casa',
    story: '«Construye una cerca. Debes construir una cerca en el perímetro de la casa, donde cada lado debe quedar conectado al pilar de color negro en cada esquina.»',
    scenarioText: 'Construye una cerca en el perímetro de la casa: cada lado debe unirse a los pilares negros de las esquinas y cumplir la pista lógica que le corresponde.',
    goal: 'Cercar el perímetro de la casa: cada lado mide 12 unidades y debe cumplir su pista lógica.',
    steps: ['Analiza las pistas lógicas para determinar el tamaño exacto de cada lado.', 'Arrastra las piezas que sumen el valor indicado por la pista secreta.', 'Une cada lado a los pilares negros ubicados en las esquinas de la casa.', 'Completa el perímetro total para finalizar la construcción de la cerca.'],
    incomplete: 'Aún no has completado todos los lados de la cerca.', success: '¡CERCA COMPLETADA CON ÉXITO!', summary: 'Cerca validada (expresión numérica)' },
};


/** Imágenes incluidas dentro de la app (sin depender de servidores externos). */
export const BG_IMAGES: Record<ActivityKey, string | null> = { TSD1: volantinImg, TSD2: castilloImg, TSD3: null };
export const HOUSE_IMAGE = houseImg;
export const HEADER_IMAGE = headerImg;
