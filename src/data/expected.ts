import type { FormulationAnswers } from '../labTypes';

/**
 * RÚBRICAS DE IM10 (corrección de la formulación, no extensión).
 *
 * Cada pregunta de formulación (TSD 1) o de anclaje (TSD 2 y 3) tiene CUATRO grupos de términos equivalentes.
 * Tocar un grupo es contener cualquiera de sus términos. La respuesta es correcta si toca AL MENOS `minimoGrupos`
 * grupos distintos (3 en las seis preguntas). Un mismo fragmento del texto no puede acreditar dos grupos.
 *
 * Se editan SOLO aquí (datos); el motor de comparación está más abajo y no depende de ninguna rúbrica concreta.
 * La habilitación de preguntas y el acceso a TSD 2 / TSD 3 NO usan esta corrección (siguen pidiendo una respuesta con
 * contenido), de modo que una rúbrica mal calibrada nunca bloquea a la estudiante.
 *
 * Cómo se compara (ver `evaluateAnswer`):
 *  · Texto y términos se normalizan igual: minúsculas, sin tildes (la «ñ» queda «n»), solo letras y cifras.
 *    Escribe los términos sin tildes ni «ñ».
 *  · Numerales ≡ palabras: «1» = «uno» = «una» (y 2…12 con sus palabras). En un término, «un» acepta «un» o «1».
 *  · Coincidencia por raíz: «descomponer» acepta «descompone», «descomposición», «descomponen»… (ver `tokenCoincide`).
 *    Los términos de varias palabras exigen las palabras consecutivas. Los verbos irregulares («convertir» →
 *    «convierte») no comparten raíz: si hace falta, agrégalos como término.
 *  · Un término no puede acreditar dos grupos: cada grupo debe apoyarse en palabras distintas del texto
 *    (p. ej. «cada una» en un grupo consume su «una»; para acreditar otro grupo con «una» hace falta otra «una»).
 */
export interface GrupoTerminos { id: string; nombre: string; terminos: string[] }
export interface RubricaPregunta { preguntaId: string; grupos: GrupoTerminos[]; minimoGrupos: number }

export type AnswerKey = keyof FormulationAnswers;

export const RUBRICAS: RubricaPregunta[] = [
  { preguntaId: 'q1', minimoGrupos: 3, grupos: [
    { id: 'G1', nombre: 'Variación', terminos: ['cambia', 'aumenta', 'crece', 'sube', 'diferencia', 'varia', 'mas largo'] },
    { id: 'G2', nombre: 'Constancia', terminos: ['siempre', 'misma', 'mismo', 'igual', 'constante', 'cada vez', 'todas'] },
    { id: 'G3', nombre: 'La unidad', terminos: ['uno', 'una', '1', 'unidad', 'blanca', 'una regleta mas', 'un cubito'] },
    { id: 'G4', nombre: 'Comparación', terminos: ['escalon anterior', 'el siguiente', 'entre uno y otro', 'respecto'] },
  ] },
  { preguntaId: 'q2', minimoGrupos: 3, grupos: [
    { id: 'G1', nombre: 'La pieza', terminos: ['blanca', 'uno', 'una', '1', 'la mas pequena', 'la mas corta', 'la menor'] },
    { id: 'G2', nombre: 'Acción', terminos: ['cubre', 'cubrir', 'mide', 'medir', 'cabe', 'caben', 'entra', 'completa', 'forma'] },
    { id: 'G3', nombre: 'Alcance', terminos: ['todas', 'todas las demas', 'cualquiera', 'cada una', 'siempre', 'cualquier'] },
    { id: 'G4', nombre: 'Repetición', terminos: ['repetir', 'repito', 'varias veces', 'copias', 'muchas veces', 'iterar'] },
  ] },
  { preguntaId: 'q3', minimoGrupos: 3, grupos: [
    { id: 'G1', nombre: 'Designación', terminos: ['nombre', 'nombrar', 'llamar', 'le digo', 'numero', 'se llama'] },
    { id: 'G2', nombre: 'Conteo', terminos: ['cuantas', 'veces', 'cantidad', 'contar', 'caben', 'entran', 'equivale'] },
    { id: 'G3', nombre: 'Referencia', terminos: ['blanca', 'unidad', 'la mas pequena', 'uno', 'una', '1'] },
    { id: 'G4', nombre: 'Unicidad', terminos: ['distinto', 'diferente', 'unico', 'no se repite', 'cada una', 'propio'] },
  ] },
  { preguntaId: 'q4', minimoGrupos: 3, grupos: [
    { id: 'G1', nombre: 'Operación', terminos: ['sumar', 'sumo', 'agregar', 'anadir', 'mas', 'aumentar', 'poner'] },
    { id: 'G2', nombre: 'Cantidad', terminos: ['uno', 'una', '1', 'unidad', 'blanca'] },
    { id: 'G3', nombre: 'Generalidad', terminos: ['cualquier', 'cualquiera', 'siempre', 'todos', 'cada', 'en general', 'n'] },
    { id: 'G4', nombre: 'Sucesión', terminos: ['siguiente', 'el que sigue', 'despues', 'anterior', 'sucede', 'continua'] },
  ] },
  { preguntaId: 'tsd2Bridge', minimoGrupos: 3, grupos: [
    { id: 'G1', nombre: 'Descomposición', terminos: ['descomponer', 'descomposicion', 'partes', 'dividir', 'repartir', 'separar', 'componer', 'composicion'] },
    { id: 'G2', nombre: 'Equivalencia', terminos: ['mismo total', 'mismo largo', 'misma medida', 'mismo numero', 'igual', 'la misma', 'lo mismo'] },
    { id: 'G3', nombre: 'Multiplicidad', terminos: ['distintas formas', 'varias maneras', 'diferentes combinaciones', 'muchas', 'varias', 'distintas', 'mas de una'] },
    { id: 'G4', nombre: 'Tamaño y cantidad', terminos: ['mas grandes', 'mas pequenas', 'menos piezas', 'mas piezas', 'cuantas mas', 'menos regletas', 'mientras'] },
  ] },
  { preguntaId: 'tsd3Bridge', minimoGrupos: 3, grupos: [
    { id: 'G1', nombre: 'La regla escrita', terminos: ['regla', 'pista', 'expresion', 'enunciado', 'frase', 'lo que dice', 'condicion', 'instruccion'] },
    { id: 'G2', nombre: 'Traducción', terminos: ['traducir', 'convertir', 'pasar', 'interpretar', 'representar', 'transformar', 'llevar', 'leer'] },
    { id: 'G3', nombre: 'Equivalencia', terminos: ['misma longitud', 'mismo total', 'mismo largo', 'igual', 'equivalente', 'la misma', 'lo mismo'] },
    { id: 'G4', nombre: 'Diversidad', terminos: ['distintas', 'diferentes', 'varias formas', 'aunque', 'distinta combinacion', 'cada lado', 'no es la unica'] },
  ] },
];

export const rubricaDe = (preguntaId: string): RubricaPregunta => {
  const r = RUBRICAS.find((x) => x.preguntaId === preguntaId);
  if (!r) throw new Error(`Sin rúbrica para la pregunta ${preguntaId}`);
  return r;
};

/* ───────────── Motor de comparación (no editar para ajustar términos) ───────────── */

const NUMERALES: Record<string, string> = { uno: '1', una: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10', once: '11', doce: '12' };
/** Minúsculas, sin tildes, solo letras y cifras; numerales en palabras → cifras. */
export const tokenizar = (texto: string): string[] =>
  texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map((t) => NUMERALES[t] ?? t);

const SUF_CORTOS = ['', 's', 'es', 'n', 'r', 'nes'];
const TERMINACIONES_VERBO = ['', 'a', 'as', 'an', 'o', 'amos', 'ar', 'ando', 'ado', 'ada', 'e', 'es', 'en', 'er', 'emos', 'iendo', 'ido', 'ir', 'imos'];

/** ¿El token del texto corresponde a la palabra del término? (coincidencia por raíz) */
export function tokenCoincide(termino: string, token: string): boolean {
  if (/^\d+$/.test(termino)) return token === termino;
  if (termino === 'un') return token === 'un' || token === '1';
  if (token === termino) return true;
  const L = termino.length;
  if (L <= 3) return false;
  const esInfinitivo = L >= 5 && /(ar|er|ir)$/.test(termino);
  if (esInfinitivo) { const raiz = termino.slice(0, -2); if (TERMINACIONES_VERBO.some((s) => token === raiz + s)) return true; }
  if (L <= 5) return SUF_CORTOS.some((s) => token === termino + s);
  const raiz = L >= 8 ? termino.slice(0, -3) : termino.slice(0, -1);
  return token.startsWith(raiz);
}

interface Acierto { grupo: string; termino: string; desde: number; hasta: number }
/** Todas las apariciones de términos de la rúbrica en el texto (sin la regla de exclusividad). */
function aciertos(r: RubricaPregunta, tokens: string[]): Acierto[] {
  const out: Acierto[] = [];
  for (const g of r.grupos) for (const termino of g.terminos) {
    const partes = tokenizar(termino);
    for (let i = 0; i + partes.length <= tokens.length; i++) {
      if (partes.every((p, k) => tokenCoincide(p, tokens[i + k]))) out.push({ grupo: g.id, termino, desde: i, hasta: i + partes.length - 1 });
    }
  }
  return out;
}

/** Términos de la rúbrica que aparecen en un texto (cualquier grupo). Sirve para auditar las devoluciones. */
export function terminosEncontrados(preguntaId: string, texto: string): { grupo: string; termino: string }[] {
  const vistos = new Set<string>(); const out: { grupo: string; termino: string }[] = [];
  for (const a of aciertos(rubricaDe(preguntaId), tokenizar(texto))) { const k = `${a.grupo}|${a.termino}`; if (!vistos.has(k)) { vistos.add(k); out.push({ grupo: a.grupo, termino: a.termino }); } }
  return out;
}

export interface Evaluation {
  correcta: boolean;
  /** Ids de los grupos tocados (con apoyo en palabras distintas del texto). */
  tocados: string[];
  /** Ids de los grupos no tocados. */
  noTocados: string[];
  /** Por cada grupo tocado, el término que lo acreditó. Dato descriptivo para revisar la exigencia de la rúbrica. */
  terminos: Record<string, string>;
  minimo: number;
  caracteres: number;
  palabras: number;
}

/**
 * Marca una respuesta como correcta si toca ≥ `minimoGrupos` grupos distintos. Un mismo fragmento del texto no
 * acredita dos grupos: se busca la asignación (grupo → aparición) con apariciones disjuntas que maximiza los grupos
 * tocados. Texto vacío = incorrecta.
 */
export function evaluateAnswer(key: AnswerKey | string, text: string): Evaluation {
  const r = rubricaDe(key); const t = text.trim();
  const tokens = tokenizar(t);
  const todos = aciertos(r, tokens);
  const porGrupo = r.grupos.map((g) => todos.filter((a) => a.grupo === g.id));
  let mejor: (Acierto | null)[] = r.grupos.map(() => null); let mejorN = 0;
  const elegidos: (Acierto | null)[] = [];
  const choca = (a: Acierto) => elegidos.some((o) => o && !(a.hasta < o.desde || a.desde > o.hasta));
  const dfs = (i: number, n: number) => {
    if (i === r.grupos.length) { if (n > mejorN) { mejorN = n; mejor = [...elegidos]; } return; }
    for (const a of porGrupo[i]) { elegidos.length = i; if (choca(a)) continue; elegidos[i] = a; dfs(i + 1, n + 1); }
    elegidos.length = i; elegidos[i] = null; dfs(i + 1, n);
  };
  dfs(0, 0);
  const tocados = r.grupos.filter((_, i) => mejor[i]).map((g) => g.id);
  const terminos: Record<string, string> = {}; r.grupos.forEach((g, i) => { const a = mejor[i]; if (a) terminos[g.id] = a.termino; });
  return { correcta: t.length > 0 && tocados.length >= r.minimoGrupos, tocados, noTocados: r.grupos.filter((g) => !tocados.includes(g.id)).map((g) => g.id), terminos, minimo: r.minimoGrupos, caracteres: t.length, palabras: t.split(/\s+/).filter(Boolean).length };
}
