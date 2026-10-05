/* Verifica que NINGUNA devolución de una pregunta contenga un término de los grupos de su propia pregunta (src/data/expected.ts).
 * Uso: npx tsx scripts/check-devoluciones.ts   (sale con código 1 si hay choques) */
import { register } from 'node:module';
register('./assets-loader.mjs', import.meta.url);
const { FORMULATION_QUESTIONS, ANCHOR_CONFIGS } = await import('../src/data/lab');
const { terminosEncontrados } = await import('../src/data/expected');
const items: { id: string; devs: string[] }[] = [
  ...FORMULATION_QUESTIONS.map((q) => ({ id: `q${q.id}`, devs: q.devoluciones })),
  { id: 'tsd2Bridge', devs: ANCHOR_CONFIGS.TSD2.devoluciones }, { id: 'tsd3Bridge', devs: ANCHOR_CONFIGS.TSD3.devoluciones },
];
let choques = 0;
for (const it of items) it.devs.forEach((d, i) => { const c = terminosEncontrados(it.id, d); if (c.length) { choques++; console.log(`CHOQUE ${it.id} devolución ${i + 1}: ${c.map((x) => `${x.grupo}«${x.termino}»`).join(', ')}`); } });
console.log(choques ? `\n${choques} devolución(es) con choques` : 'Sin choques: ninguna devolución contiene términos de su rúbrica.');
process.exit(choques ? 1 : 0);
