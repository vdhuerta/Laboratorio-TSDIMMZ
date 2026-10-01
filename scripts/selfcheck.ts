// Lee un reporte descargado con el parser del Diario (copia en src/lib/immz) e imprime lo que el Diario vería.
import fs from 'fs';
import { parseReportText } from '../src/lib/immz/parser';
const f = process.argv[2]; const html = fs.readFileSync(f, 'utf8'); const p = parseReportText(html, f.split('/').pop()!);
console.log({ app: p.simulator, clase: p.classNumber, alumno: p.studentName, esquema: p.sourceVersion, immz: p.immz, ao: p.immzAO, ac: p.immzAC, idcd: p.idcd, immg: p.immg, apropiacion: p.apropiacion, aciertos: p.aciertos, errores: p.errores, reflexiones: p.reflexiones, avisos: p.warnings });
console.log(p.indicators.map((i) => `${i.id}=${i.value}`).join(' '));
const first = /<script[^>]*type="application\/json"[^>]*id="([^"]+)"|<script[^>]*id="([^"]+)"[^>]*type="application\/json"/.exec(html);
console.log('primer JSON:', first?.[1] ?? first?.[2]);
console.log('menciones de tesis/doctorado:', (html.match(/tesis|doctor|Huerta|UPLA/gi) ?? []).length);
