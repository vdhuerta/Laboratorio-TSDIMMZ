/* Pruebas de las rúbricas de IM10 (src/data/expected.ts): criterio «al menos 3 de 4 grupos», normalización, raíz,
 * numerales y exclusividad de términos; más tres respuestas de prueba por pregunta (buena, parcial, vacía).
 * Uso: npx tsx scripts/test-rubricas.ts */
import { RUBRICAS, evaluateAnswer, tokenizar } from '../src/data/expected';

let fails = 0;
const chk = (n: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? '  ok ' : 'FALLA'} ${n}${ok ? '' : `  → ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`}`); };

/* 1 · Estructura */
chk('seis rúbricas', RUBRICAS.length, 6);
chk('todas con 4 grupos y minimoGrupos 3', RUBRICAS.every((r) => r.grupos.length === 4 && r.minimoGrupos === 3), true);

/* 2 · Tres respuestas por pregunta: buena / parcial / vacía */
const CASOS: { q: string; buena: string; parcial: string; tb: string[]; tp: string[] }[] = [
  { q: 'q1', buena: 'Cada escalón crece una regleta blanca más que el escalón anterior, siempre igual.', parcial: 'Cada escalón crece, siempre.', tb: ['G1', 'G2', 'G3', 'G4'], tp: ['G1', 'G2'] },
  { q: 'q2', buena: 'La blanca: la repito varias veces y cubre cualquiera de las otras.', parcial: 'La blanca cubre algunas.', tb: ['G1', 'G2', 'G3', 'G4'], tp: ['G1', 'G2'] },
  { q: 'q3', buena: 'Le doy el nombre contando cuántas blancas caben en cada regleta, y cada una tiene un número distinto.', parcial: 'Se llama según la cantidad de veces.', tb: ['G1', 'G2', 'G3', 'G4'], tp: ['G1', 'G2'] },
  { q: 'q4', buena: 'Para pasar al escalón siguiente le sumas uno al anterior, en cualquier escalón.', parcial: 'Vas sumando uno.', tb: ['G1', 'G2', 'G3', 'G4'], tp: ['G1', 'G2'] },
  { q: 'tsd2Bridge', buena: 'Se puede descomponer el mismo largo en partes de distintas formas; con regletas más pequeñas se necesitan más piezas.', parcial: 'Se puede descomponer en partes de varias maneras.', tb: ['G1', 'G2', 'G3', 'G4'], tp: ['G1', 'G3'] },
  { q: 'tsd3Bridge', buena: 'Hay que traducir la pista de cada lado a regletas; todos miden lo mismo aunque la regla sea distinta.', parcial: 'Interpreto la pista para saber cuánto mide.', tb: ['G1', 'G2', 'G3', 'G4'], tp: ['G1', 'G2'] },
];
const filas: string[] = [];
for (const c of CASOS) {
  const b = evaluateAnswer(c.q, c.buena), p = evaluateAnswer(c.q, c.parcial), v = evaluateAnswer(c.q, '');
  chk(`${c.q} buena → correcta`, b.correcta, true); chk(`${c.q} buena → grupos`, b.tocados, c.tb);
  chk(`${c.q} parcial → incorrecta`, p.correcta, false); chk(`${c.q} parcial → grupos`, p.tocados, c.tp);
  chk(`${c.q} vacía → incorrecta y sin grupos`, [v.correcta, v.tocados], [false, []]);
  filas.push(`${c.q.padEnd(10)} buena   ${b.correcta ? 'CORRECTA  ' : 'incorrecta'} [${b.tocados.join(',')}]  ${JSON.stringify(b.terminos)}`, `${''.padEnd(10)} parcial ${p.correcta ? 'CORRECTA  ' : 'incorrecta'} [${p.tocados.join(',')}]  ${JSON.stringify(p.terminos)}`, `${''.padEnd(10)} vacía   ${v.correcta ? 'CORRECTA  ' : 'incorrecta'} [${v.tocados.join(',')}]`);
}

/* 3 · Normalización, raíz y numerales */
chk('«1» = «uno» = «una»', [tokenizar('1'), tokenizar('Uno'), tokenizar('UNA')], [['1'], ['1'], ['1']]);
chk('tildes y ñ', tokenizar('Pequeña, ESCALÓN'), ['pequena', 'escalon']);
for (const w of ['descomponer', 'descompone', 'descomposición', 'Descomponen']) chk(`raíz: «${w}» acredita G1 de TSD2`, evaluateAnswer('tsd2Bridge', w).tocados, ['G1']);
chk('«1 cubito» acredita «un cubito» (q1 G3)', evaluateAnswer('q1', 'agregas 1 cubito').tocados.includes('G3'), true);
chk('«un» como artículo NO acredita la unidad (q1)', evaluateAnswer('q1', 'un aumento').tocados.includes('G3'), false);
chk('«entre» no acredita «entra» (q2 G2)', evaluateAnswer('q2', 'entre las regletas').tocados.includes('G2'), false);
chk('«formulación» no acredita «forma» (q2 G2)', evaluateAnswer('q2', 'mi formulación').tocados.includes('G2'), false);

/* 4 · Un mismo término no acredita dos grupos */
chk('q3 «cada una» solo acredita UN grupo (G3 o G4, no ambos)', evaluateAnswer('q3', 'cada una').tocados.length, 1);
chk('q3 «cada una … una»: con una «una» extra acredita G3 y G4', evaluateAnswer('q3', 'cada una, una vez').tocados.sort(), ['G3', 'G4']);
chk('q2 «cada una» solo acredita UN grupo (G1 o G3, no ambos)', evaluateAnswer('q2', 'cada una').tocados.length, 1);
chk('q1 una sola «uno» no acredita dos grupos', evaluateAnswer('q1', 'uno').tocados, ['G3']);

/* 5 · Umbral */
chk('2 grupos → incorrecta; 3 → correcta', [evaluateAnswer('q4', 'sumar uno').correcta, evaluateAnswer('q4', 'sumar uno cada vez').correcta], [false, true]);
chk('texto sin términos pero largo → incorrecta', evaluateAnswer('q2', 'x '.repeat(80)).correcta, false);

console.log('\n── Detalle de las respuestas de prueba ──\n' + filas.join('\n'));
console.log(fails ? `\n${fails} FALLAS` : '\nTodo OK');
process.exit(fails ? 1 : 0);
