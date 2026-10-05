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

/* ───────────── Estructura de la sesión ─────────────
 * Las tres actividades NO son formas paralelas entre sí: son una progresión didáctica y juntas forman UNA sesión de 18 carriles.
 *  · TSD 1 · El Volantín: debe emerger la correspondencia biunívoca entre cada regleta y un número del 1 al 10.
 *    10 escalones, cada uno se completa con UNA sola regleta (no hay combinatoria). Las metas son exactamente el conjunto 1..10,
 *    sin repetir ni omitir: si falta una la correspondencia queda incompleta y si se repite se rompe la biyección.
 *  · TSD 2 · El Puente: debe emerger la composición aditiva del entero; cualquier descomposición que sume la meta es válida.
 *    1 puente de 4 vías con metas entre 5 y 7 (con 8 hay 22 descomposiciones y con 9 hay 30: espacio de búsqueda excesivo).
 *  · TSD 3 · La Cerca: debe emerger la CONVERSIÓN ENTRE REGISTROS (Duval). 1 cerca de 4 lados con perímetro 12.
 * Las FORMAS A/B/C son tres versiones numéricas de ESTA MISMA sesión (ver FORMAS más abajo). */
export const ACTIVITIES: ActivityKey[] = ['TSD1', 'TSD2', 'TSD3'];
export const LANE_COUNT: Record<ActivityKey, number> = { TSD1: 10, TSD2: 4, TSD3: 4 };
export const TOTAL_LANES = 18;
export const TSD1_VISUAL_CAPACITY = 11; // largo visual de cada escalón: una unidad más que la meta mayor (no revela la meta de cada uno)
export const TARGET_MIN = 5, TARGET_MAX = 7, TARGET_DEFAULT = 6;   // metas de las vías del puente (selector de Configuración)

export const ACTIVITY_META: Record<ActivityKey, { short: string; name: string; scene: string; color: string }> = {
  TSD1: { short: 'TSD 1 (Volantín)', name: 'El Volantín', scene: 'La Escalera', color: 'sky' },
  TSD2: { short: 'TSD 2 (Puente)', name: 'El Puente', scene: 'El Puente del Castillo', color: 'brand' },
  TSD3: { short: 'TSD 3 (Cerca)', name: 'La Cerca', scene: 'La Cerca de la Casa', color: 'amber' },
};

export const activeLanes = (act: ActivityKey, _cfg?: unknown): number[] => Array.from({ length: LANE_COUNT[act] }, (_, i) => i);
export const laneCount = (act: ActivityKey, _cfg?: unknown) => LANE_COUNT[act];
export const totalLanes = (_cfg?: unknown) => TOTAL_LANES;

/* ───────────── Contenido declarado de cada forma ─────────────
 * Ninguna meta ni patrón se deduce de la posición del carril: viajan como datos. */

/** TSD 1: `rotulo` es el número visible del escalón (contado desde abajo); `meta` la regleta que le corresponde. Son independientes. */
export interface Escalon { id: string; rotulo: number; meta: number }

/** Registro semiótico en que se enuncia la pista de un lado de la cerca. */
export type RegistroCerca = 'natural_multiplicativo' | 'algebraico' | 'natural_duplicacion' | 'comparacion_aditiva';
/** TSD 3: pista (clue) en un registro dado, su lectura numérica (expr) y el patrón de regletas que la representa (figural). */
export interface LadoCerca {
  idx: number; label: string; name: string; registro: RegistroCerca; clue: string; expr: string; pattern: number[];
  /** Otras composiciones que leen la MISMA pista y también son correctas. «Doble de X más Y» admite dos lecturas: dos regletas de X ({X, X, Y}, el patrón) o una sola regleta de 2X ({2X, Y}). */
  equivalentes?: number[][];
}

export type FormaId = 'A' | 'B' | 'C';
export interface Forma {
  id: FormaId; nombre: string; contentLevel: number; contentId: string;
  /** TSD 1, de arriba hacia abajo (orden de dibujo). Debe contener las metas 1..10 exactamente una vez. */
  escalera: Escalon[];
  /** TSD 2: meta de cada una de las 4 vías (valores de {5,6,7}). `null` = las cuatro valen `targetUnits` (selector de Configuración). */
  puenteMetas: number[] | null;
  /** TSD 3: los cuatro lados, perímetro 12, con el mismo perfil de registros en todas las formas (L1 multiplicativo «k veces m», L2 algebraico «an+b», L3 duplicación «doble de X más Y» = {X, X, Y}, L4 comparación aditiva «dos números que se diferencian en d» = {a, a+d}). */
  cerca: LadoCerca[];
}
const escalera = (metas: number[]): Escalon[] => metas.map((meta, i) => ({ id: `E${metas.length - i}`, rotulo: metas.length - i, meta }));
/** Orden de los lados: L1→L4; `idx` es el carril interno (L1=3, L2=0, L3=1, L4=2, como en la app original). */
export const PERFIL_REGISTROS: RegistroCerca[] = ['natural_multiplicativo', 'algebraico', 'natural_duplicacion', 'comparacion_aditiva'];

/** FORMA A. Las formas se agregan a `FORMAS` solo cuando su contenido didáctico está validado. */
const FORMA_A: Forma = {
  id: 'A', nombre: 'Forma A', contentLevel: 1, contentId: 'lab-tsd-A',
  escalera: escalera([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  puenteMetas: null,
  cerca: [
    { idx: 3, label: 'L1', name: 'Lado 1', registro: 'natural_multiplicativo', clue: '2 veces 6', expr: '6 + 6', pattern: [6, 6] },
    { idx: 0, label: 'L2', name: 'Lado 2', registro: 'algebraico', clue: '3n+3', expr: '3 + 3 + 3 + 3', pattern: [3, 3, 3, 3] },
    { idx: 1, label: 'L3', name: 'Lado 3', registro: 'natural_duplicacion', clue: 'doble de 1 más 10', expr: '1 + 1 + 10', pattern: [1, 1, 10], equivalentes: [[2, 10]] },
    { idx: 2, label: 'L4', name: 'Lado 4', registro: 'comparacion_aditiva', clue: 'dos números que se diferencian en 2', expr: '5 + 7', pattern: [5, 7] },
  ],
};
/**
 * FORMA B: mismo perfil, otro orden de metas / otra distribución de vías / otras pistas. Contenido validado por el investigador.
 * La FORMA C está PENDIENTE: el patrón propuesto para sus lados exigía 7 regletas de 3 en una misma cerca (el inventario es de 4).
 */
const FORMA_B: Forma = {
  id: 'B', nombre: 'Forma B', contentLevel: 1, contentId: 'lab-tsd-B',
  escalera: escalera([4, 9, 2, 7, 10, 1, 6, 3, 8, 5]),
  puenteMetas: [5, 7, 5, 7],
  cerca: [
    { idx: 3, label: 'L1', name: 'Lado 1', registro: 'natural_multiplicativo', clue: '3 veces 4', expr: '4 + 4 + 4', pattern: [4, 4, 4] },
    { idx: 0, label: 'L2', name: 'Lado 2', registro: 'algebraico', clue: '2n+2', expr: '2 + 5 + 5', pattern: [2, 5, 5] },
    { idx: 1, label: 'L3', name: 'Lado 3', registro: 'natural_duplicacion', clue: 'doble de 2 más 8', expr: '2 + 2 + 8', pattern: [2, 2, 8], equivalentes: [[4, 8]] },
    { idx: 2, label: 'L4', name: 'Lado 4', registro: 'comparacion_aditiva', clue: 'dos números que se diferencian en 4', expr: '4 + 8', pattern: [4, 8] },
  ],
};
export const FORMAS: Forma[] = [FORMA_A, FORMA_B];
export const DEFAULT_FORM: FormaId = 'A';
export const FORMA_IDS = FORMAS.map((f) => f.id);
export const formaDe = (cfg: Pick<LabConfig, 'formId'>): Forma => FORMAS.find((f) => f.id === cfg.formId) ?? FORMAS[0];

export type LaneCfg = Pick<LabConfig, 'formId' | 'targetUnits'>;
export const escalonesDe = (cfg: LaneCfg): Escalon[] => formaDe(cfg).escalera;
export const escalonOf = (cfg: LaneCfg, idx: number): Escalon => escalonesDe(cfg)[idx];
export const puenteMetas = (cfg: LaneCfg): number[] => formaDe(cfg).puenteMetas ?? Array.from({ length: LANE_COUNT.TSD2 }, () => cfg.targetUnits);
export const ladosDe = (cfg: LaneCfg): LadoCerca[] => formaDe(cfg).cerca;
export const ladoOf = (cfg: LaneCfg, idx: number): LadoCerca => ladosDe(cfg).find((l) => l.idx === idx)!;

const sum = (ls: number[]) => ls.reduce((s, l) => s + l, 0);
/** Meta real del carril (lo que debe sumar). Siempre se lee del dato declarado, nunca del índice. */
export const realTarget = (act: ActivityKey, idx: number, cfg: LaneCfg) =>
  (act === 'TSD1' ? escalonOf(cfg, idx).meta : act === 'TSD2' ? puenteMetas(cfg)[idx] : sum(ladoOf(cfg, idx).pattern));
/** Capacidad visual del carril (lo que cabe físicamente). En TSD 1 todos los escalones miden lo mismo para no dar la respuesta. */
export const visualCapacity = (act: ActivityKey, idx: number, cfg: LaneCfg) => (act === 'TSD1' ? TSD1_VISUAL_CAPACITY : realTarget(act, idx, cfg));

const sameSorted = (a: number[], b: readonly number[]) => a.length === b.length && [...a].sort((x, y) => x - y).every((v, i) => v === [...b].sort((x, y) => x - y)[i]);

/**
 * Validación de un carril según lo que la actividad debe hacer emerger:
 *  · TSD 1 (correspondencia biunívoca): UNA sola regleta, de largo igual a la meta declarada del escalón. No hay combinatoria.
 *  · TSD 2 (composición aditiva): CUALQUIER descomposición que sume la meta es válida.
 *  · TSD 3 (conversión entre registros, Duval): la descomposición es ÚNICA y la determina la pista. La estudiante lee la pista en
 *    lengua natural o en escritura algebraica (registro de partida), la convierte al registro numérico (la expresión) y de ahí al
 *    figural (las regletas). Por eso NO basta con que las regletas sumen el perímetro del lado: deben ser exactamente las piezas del
 *    patrón de su pista (`sameSorted`, sin importar el orden). Un lado con la suma correcta pero otra composición es un error de
 *    conversión, no un error aritmético, y se marca como tal (`isLaneWrong`).
 */
export function isLaneCorrect(act: ActivityKey, idx: number, lengths: number[], cfg: LaneCfg): boolean {
  if (act === 'TSD1') return lengths.length === 1 && lengths[0] === escalonOf(cfg, idx).meta;
  if (act === 'TSD2') return sum(lengths) === puenteMetas(cfg)[idx];
  const l = ladoOf(cfg, idx);
  return [l.pattern, ...(l.equivalentes ?? [])].some((p) => sameSorted(lengths, p));
}
/** TSD 3: el lado llegó a su largo (o se pasó) pero con una composición que no corresponde a la pista. */
export const isLaneWrong = (act: ActivityKey, idx: number, lengths: number[], cfg: LaneCfg) => act === 'TSD3' && sum(lengths) >= realTarget(act, idx, cfg) && !isLaneCorrect(act, idx, lengths, cfg);

/** Contenedor con piezas que no corresponden (para el «ojo»): TSD 1 con una regleta que no es la del escalón; TSD 2 pasado de la meta; TSD 3 con otra composición. */
export const isLaneFlagged = (act: ActivityKey, idx: number, lengths: number[], cfg: LaneCfg) =>
  act === 'TSD1' ? lengths.length > 0 && !isLaneCorrect(act, idx, lengths, cfg) : act === 'TSD2' ? sum(lengths) > realTarget(act, idx, cfg) : isLaneWrong(act, idx, lengths, cfg);

/** Declaración de la SESIÓN completa (estándar IMMZ 4.1): forma A/B/C, nivel y contenido. Va a nivel de sesión, no por actividad. */
export interface FormDef { formId: FormaId; contentLevel: number; contentId: string }
export const formOf = (cfg: Pick<LabConfig, 'formId'>): FormDef => { const f = formaDe(cfg); return { formId: f.id, contentLevel: f.contentLevel, contentId: f.contentId }; };
/** Preguntas de formulación/anclaje que ofrece cada actividad (TSD 1: 4 preguntas; TSD 2 y 3: 1 pregunta puente). */
export const FORMULATIONS_OFFERED: Record<ActivityKey, number> = { TSD1: 4, TSD2: 1, TSD3: 1 };
export interface FormOpportunity { lanes: number; devoluciones: number; formulaciones: number }
/** Oportunidades que ofrece la actividad: carriles, devoluciones (una situación graduada por carril) y formulaciones. */
export const opportunityTarget = (act: ActivityKey, _cfg?: unknown): FormOpportunity => ({ lanes: LANE_COUNT[act], devoluciones: LANE_COUNT[act], formulaciones: FORMULATIONS_OFFERED[act] });
/** Piezas esperadas de la cerca de la forma (11 en todas las formas). */
export const piezasCerca = (cfg: LaneCfg): number => ladosDe(cfg).reduce((n, l) => n + l.pattern.length, 0);
/** Oportunidades de la sesión (idénticas en las tres formas): 18 carriles, 18 devoluciones, 6 formulaciones. */
export const sessionOpportunity = (): FormOpportunity => ACTIVITIES.reduce((t, a) => { const o = opportunityTarget(a); return { lanes: t.lanes + o.lanes, devoluciones: t.devoluciones + o.devoluciones, formulaciones: t.formulaciones + o.formulaciones }; }, { lanes: 0, devoluciones: 0, formulaciones: 0 });

/* ───────────── Formulación (TSD 1) y anclajes (TSD 2 y 3) ───────────── */
export interface QuestionConfig { id: number; title: string; subhead: string; enunciado: string; devoluciones: string[]; unlockConditionText: string }
export const FORMULATION_QUESTIONS: QuestionConfig[] = [
  { id: 1, title: 'Pregunta 1', subhead: 'Observación de la regularidad',
    enunciado: 'Observa la escalera que construiste. Recórrela de abajo hacia arriba: ¿qué cambia cuando pasas de un escalón al siguiente? Descríbelo con tus palabras.',
    devoluciones: ['Elige dos escalones que estén uno al lado del otro y compáralos. ¿En qué se parecen y en qué se diferencian?', 'En el área de experimentación, coloca regletas sobre la diferencia entre esos dos escalones hasta cubrirla exactamente. ¿Qué encuentras?', 'Recorre la escalera en dos tramos que estén lejos entre sí y haz en cada tramo la prueba con regletas sobre el hueco que separa un nivel del otro. Lo que encontraste en el primer tramo, ¿se repite en el segundo, o depende del lugar donde mires? Antes de escribir, anota qué pieza usaste para tapar el hueco en ambos.'],
    unlockConditionText: 'Se habilita cuando tienes correcta al menos la mitad de los escalones de la sesión.' },
  { id: 2, title: 'Pregunta 2', subhead: 'Búsqueda de una medida común',
    enunciado: '¿Con cuál de las regletas podrías cubrir exactamente todas las demás? Compruébalo en el área de experimentación y describe lo que encontraste.',
    devoluciones: ['Toma una regleta de color y trata de cubrirla exactamente con varias copias de otra regleta más corta. Prueba con distintas combinaciones.', 'Anota con cuáles lo lograste y con cuáles no. ¿Hay alguna que te sirva para todas?', 'Toma alguna de las regletas que probaste y compárala con la de mayor largo, luego con la de menor largo y luego con otra de largo intermedio. En cada caso, cuenta cuántas veces tuviste que ponerla en fila para llegar al otro extremo. ¿Hubo algún caso en que se quedara corta o sobrara un trozo? Anótalo antes de decidir si esa es tu elegida.'],
    unlockConditionText: 'Se habilita cuando la escalera de la sesión esté completa.' },
  { id: 3, title: 'Pregunta 3', subhead: 'Del largo al nombre numérico',
    enunciado: 'Si usas la regleta que encontraste para medir, ¿qué nombre le darías a cada una de las otras? Explica en qué te basas para darle ese nombre.',
    devoluciones: ['Vuelve a lo que anotaste en la pregunta anterior. ¿Ese resultado te sirve para nombrar cada regleta?', 'Escribe el nombre que le darías a tres regletas distintas y compáralo con la posición que ocupan en la escalera. ¿Coinciden?', 'Elige tres regletas de largos muy alejados entre sí y, con la pieza que encontraste antes, arma cada largo. Anota qué obtuviste en cada caso y compara tus tres anotaciones: ¿pueden coincidir dos de ellas para regletas que no miden igual? Revísalo con el material antes de escribir.'],
    unlockConditionText: 'Se habilita al responder la Pregunta 2 por escrito.' },
  { id: 4, title: 'Pregunta 4', subhead: 'La relación entre un escalón y el siguiente',
    enunciado: 'Ya le diste un nombre a cada regleta. Ahora explica cómo se obtiene el escalón que sigue hacia arriba, a partir de cualquier escalón. Escríbelo de manera que le sirva a otra persona para cualquier escalón de la escalera.',
    devoluciones: ['Elige un escalón cualquiera y el que viene después. ¿Qué cambio tendrías que hacerle al primero para obtener el segundo?', 'Comprueba si lo que escribiste también funciona en el otro extremo de la escalera.', 'Pásale tu explicación a alguien que no vio esta escalera y pídele que construya con ella un escalón que todavía no existe. ¿Lo logra sin que tú le aclares nada? ¿Qué le faltó a tu texto, si algo?'],
    unlockConditionText: 'Se habilita al responder la Pregunta 3 por escrito.' },
];

export interface AnchorConfig { activity: 'TSD2' | 'TSD3'; title: string; subhead: string; enunciado: string; devoluciones: string[]; meta: string; placeholder: string }
export const ANCHOR_CONFIGS: Record<'TSD2' | 'TSD3', AnchorConfig> = {
  TSD2: { activity: 'TSD2', title: 'Anclaje TSD 2 — El Puente', subhead: 'Descomposición Numérica y Composición Aditiva del entero', meta: 'Composición aditiva', placeholder: 'Explica cómo se compone y descompone la medida de la vía usando diferentes partes aditivas...',
    enunciado: 'En esta actividad cada carril o vía del puente debe cubrirse exactamente usando diferentes combinaciones de regletas. ¿Cómo se relaciona lo que descubriste en la escalera con las diferentes formas de descomponer en partes aditivas el número que mide cada vía? Explica tus conclusiones.',
    devoluciones: ['Observa dos vías que hayas completado con diferente cantidad de piezas (por ejemplo, una con 2 regletas y otra con 3 o más). Si ambas alcanzan el mismo largo total (el de la vía), ¿qué relación observas entre el tamaño de cada parte y la cantidad de piezas necesarias? Compruébalo colocando las regletas juntas en la mesa de pruebas.', 'Toma las regletas de una vía válida y cambia el orden en que las colocas. ¿Sigue cubriendo exactamente la vía? Busca si existen combinaciones con las mismas piezas ordenadas distinto y combinaciones con piezas totalmente diferentes. ¿Qué te indica esto sobre cómo se puede componer un mismo número?', 'Escoge alguna vía y cúbrela usando la menor cantidad de regletas posible; después vuelve a cubrirla ocupando regletas de las más cortas del depósito. Compara tus dos armados con los de un compañero que haya buscado los suyos por su cuenta. ¿Qué relación notas entre el largo de las regletas que usaron y cuántas necesitó cada uno? ¿Cuántos armados diferentes podrían existir?'] },
  TSD3: { activity: 'TSD3', title: 'Anclaje TSD 3 — La Cerca', subhead: 'Partición del Perímetro y Equivalencia de Medidas', meta: 'Meta: cerrar los cuatro lados', placeholder: 'Explica qué tienen en común las pistas con la partición del perímetro...',
    enunciado: 'En la cerca todos los lados tienen la misma longitud total, pero cada lado te dice cómo armarlo de una manera distinta: con una multiplicación, con una expresión con letra, con un doble o con una diferencia. ¿Qué tienen en común estas formas de decir un mismo largo con la descomposición numérica que trabajaste en el puente y la escalera?',
    devoluciones: ['Compara el lado de la multiplicación con el lado de la diferencia. Ambos cubren exactamente la misma longitud. ¿Qué diferencia encuentras entre repetir una misma regleta varias veces y combinar regletas de distintos tamaños para alcanzar el mismo largo total?', 'En la mesa de pruebas, coloca juntas las regletas del lado del doble y las del lado de la expresión con letra. Aunque usan piezas de colores y tamaños muy diferentes, ¿por qué ambas logran cercar la misma distancia? Explica cómo se relacionan las sumas parciales con el total del lado.', 'Tapa las regletas y quédate solo con lo que está escrito alrededor de la casa. ¿Podrías saber, antes de tocar el material, qué piezas vas a necesitar para cada esquina? Si pudieras, cuéntaselo en voz alta a alguien que no ve la casa.'] },
};

/* ───────────── Textos de cada actividad ───────────── */
export const INTRO: Record<ActivityKey, { kicker: string; hook: string; story: string; goal: string; steps: string[]; incomplete: string; success: string; summary: string; scenarioTitle: string; scenarioText: string }> = {
  TSD1: { kicker: 'Operación El Volantín', hook: '¡Ayuda a Pedro a alcanzar el Volantín!', scenarioTitle: 'El Volantín de Pedro',
    story: 'El volantín de Pedro se ha quedado atrapado. Arrastra las regletas para construir una estructura coherente que le permita llegar hasta él.',
    scenarioText: 'Explora las piezas y utilízalas para completar los espacios en blanco de la escalera, de forma que Pedro pueda subir hasta su volantín.',
    goal: 'Explora las piezas y utilízalas para completar los espacios en blanco de la escalera de forma que Pedro pueda subir.',
    steps: ['Explora las piezas en el depósito y arrástralas al espacio de trabajo.', 'Construye la escalera de abajo hacia arriba, empezando por el Escalón 1. Cada escalón se completa con una sola regleta: busca la que le corresponde.', 'Busca una construcción coherente que permita a Pedro subir seguro.', 'Rescata el volantín completando todos los niveles de la escalera.'],
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
    goal: 'Cercar el perímetro de la casa: cada lado debe cumplir su pista lógica y quedar unido a los pilares de las esquinas.',
    steps: ['Analiza las pistas lógicas para determinar el tamaño exacto de cada lado.', 'Convierte cada pista en números y luego en regletas: arrastra las piezas que representen exactamente lo que dice la pista.', 'Une cada lado a los pilares negros ubicados en las esquinas de la casa.', 'Completa el perímetro total para finalizar la construcción de la cerca.'],
    incomplete: 'Aún no has completado todos los lados de la cerca.', success: '¡CERCA COMPLETADA CON ÉXITO!', summary: 'Cerca validada (expresión numérica)' },
};


/** Imágenes incluidas dentro de la app (sin depender de servidores externos). */
export const BG_IMAGES: Record<ActivityKey, string | null> = { TSD1: volantinImg, TSD2: castilloImg, TSD3: null };
export const HOUSE_IMAGE = houseImg;
export const HEADER_IMAGE = headerImg;
