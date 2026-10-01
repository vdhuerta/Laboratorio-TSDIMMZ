import { INDICATORS } from '../../config';
import type { AppReportIndicator, AppReportParsed } from '../../types';
import { categorize, computeIndices, diagnose } from './scoring';

type Json = unknown;
type Rec = Record<string, unknown>;
const isRec = (v: Json): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Decodifica entidades HTML comunes (&quot; &amp; &#39; &#x..;) */
export function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

/** Quita comentarios // y /* *\/ y trailing commas sin tocar el contenido de strings. */
export function cleanJsonLike(input: string): string {
  const src = input.replace(/\u0000/g, '').replace(/^﻿/, '');
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e === -1 ? src.length : e + 2; continue; }
    out += c; i++;
  }
  // trailing commas fuera de strings
  let res = '';
  for (let k = 0; k < out.length; k++) {
    const c = out[k];
    if (c === '"') {
      let j = k + 1;
      while (j < out.length && out[j] !== '"') j += out[j] === '\\' ? 2 : 1;
      res += out.slice(k, j + 1); k = j; continue;
    }
    if (c === ',') {
      let j = k + 1;
      while (j < out.length && /\s/.test(out[j])) j++;
      if (out[j] === '}' || out[j] === ']') continue;
    }
    res += c;
  }
  return res.trim();
}

function b64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function tryParse(text: string): Json | undefined {
  for (const candidate of [text, decodeEntities(text)]) {
    try { return JSON.parse(cleanJsonLike(candidate)); } catch { /* siguiente */ }
  }
  return undefined;
}

/** Extrae el payload JSON de un archivo HTML/JSON exportado por el simulador. */
export function extractPayload(raw: string, depth = 0): Json {
  if (depth > 4) throw new Error('Demasiados niveles de codificación.');
  const text = raw.replace(/\u0000/g, '');

  // 1) JSON directo
  const direct = tryParse(text.trim());
  if (direct !== undefined && (isRec(direct) || Array.isArray(direct))) return direct;

  // 2) <script id="report-data|bct-report-payload|metacognitive-analytic-payload|tsd-report-raw-data|raw-metacognitive-data">
  const scriptRe = /<script[^>]*id\s*=\s*["'](?:report-data|bct-report-payload|metacognitive-analytic-payload|tsd-report-raw-data|raw-metacognitive-data)["'][^>]*>([\s\S]*?)<\/script>/i;
  const m = scriptRe.exec(text);
  if (m) {
    const inner = m[1].trim();
    const parsed = tryParse(inner);
    if (parsed !== undefined) return parsed;
    const dm = /data:[a-z/+.-]+;base64,([A-Za-z0-9+/=\s]+)/i.exec(inner);
    if (dm) return extractPayload(b64ToUtf8(dm[1]), depth + 1);
  }

  // 3) Data URL Base64 en cualquier parte
  const du = /data:(?:text\/html|application\/json|text\/plain)[^;,]*;base64,([A-Za-z0-9+/=\s]+)/i.exec(text);
  if (du) return extractPayload(b64ToUtf8(du[1]), depth + 1);

  // 4) Cualquier <script type="application/json">
  const any = /<script[^>]*type\s*=\s*["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i.exec(text);
  if (any) { const p = tryParse(any[1]); if (p !== undefined) return p; }

  // 5) Asignación JS: const reportData = {...};
  const asg = /(?:report(?:Data)?|REPORT_DATA|__REPORT__)\s*=\s*(\{[\s\S]*?\})\s*;/i.exec(text);
  if (asg) { const p = tryParse(asg[1]); if (p !== undefined) return p; }

  throw new Error('No se encontró un bloque de datos IMMZ legible en el archivo.');
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Decodifica un data: URL (base64 o URL-encoded) o devuelve el texto tal cual. */
export function decodeRawData(raw: string): string {
  if (!raw || !raw.startsWith('data:')) return raw ?? '';
  const b = raw.indexOf(';base64,');
  if (b !== -1) { try { return b64ToUtf8(raw.slice(b + 8)); } catch { /* sigue */ } }
  const c = raw.indexOf(',');
  if (c !== -1) { try { return decodeURIComponent(raw.slice(c + 1)); } catch { return raw.slice(c + 1); } }
  return raw;
}

const SCHEMA_ORIGINAL_TO_4_0: Record<string, string> = { IM1: 'IM1', IM2: 'IM3', IM3: 'IM6', IM4: 'IM7', IM5: 'IM4', IM6: 'IM8', IM7: 'IM2', IM8: 'IM9', IM9: 'IM5', IM10: 'IM10' };
const SCHEMA_3_0_TO_4_0: Record<string, string> = { IM1: 'IM1', IM2: 'IM3', IM3: 'IM4', IM4: 'IM2', IM5: 'IM5', IM6: 'IM6', IM7: 'IM7', IM8: 'IM8', IM9: 'IM9', IM10: 'IM10' };
export type SchemaGen = 'original' | '3.0' | '4.0';

/** Traduce un código IMx del esquema de origen al esquema canónico 4.0. */
export function migrateCode(code: string, schema: SchemaGen): string | null {
  const c = String(code ?? '').toUpperCase().trim();
  if (schema === '3.0') return SCHEMA_3_0_TO_4_0[c] ?? null;
  if (schema === '4.0') return INDICATORS.some((d) => d.id === c) ? c : null;
  return SCHEMA_ORIGINAL_TO_4_0[c] ?? null;
}

function detectSchema(root: Rec): { schema: SchemaGen; explicit: boolean } {
  const raw = pick(root, ['schemaVersion', 'schema_version', 'schemaOrigen', 'version', 'reportVersion']);
  if (raw === undefined || raw === null || raw === '') return { schema: 'original', explicit: false };
  const t = String(raw).toLowerCase();
  const m = /(\d+)(?:\.(\d+))?/.exec(t);
  if (m) { const major = Number(m[1]); if (major >= 4) return { schema: '4.0', explicit: true }; if (major === 3) return { schema: '3.0', explicit: true }; return { schema: 'original', explicit: true }; }
  return { schema: 'original', explicit: /original|legacy/.test(t) };
}

function toPct(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') { const t = v.trim().toLowerCase(); if (t === '' || t === 's/e' || t === 'n/a' || t === 'na' || t === '-' || t === '—') return null; }
  const n = typeof v === 'string' ? parseFloat(v.replace('%', '').replace(',', '.')) : typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function pick(obj: Rec, keys: string[]): unknown {
  const map = new Map(Object.keys(obj).map((k) => [norm(k), obj[k]]));
  for (const k of keys) if (map.has(norm(k))) return map.get(norm(k));
  return undefined;
}

const defByName = (name: string) => { const k = norm(name); return INDICATORS.find((d) => norm(d.id) === k || norm(d.label) === k || d.aliases.some((a) => norm(a) === k)); };

/** Resultado de leer los indicadores: valor por id canónico 4.0 (null = sin evidencia). */
interface RawRead { values: Map<string, number | null>; found: number }

function readIndicators(root: Rec, schema: SchemaGen, warnings: string[]): RawRead {
  const items: { key: string; item: Rec }[] = [];
  const src = pick(root, ['indicators', 'indicadores', 'metrics', 'metricas', 'canonical']);
  const dataSrc = pick(root, ['data']);
  for (const c of [src, isRec(dataSrc) ? (pick(dataSrc as Rec, ['indicators', 'indicadores']) ?? dataSrc) : undefined]) {
    if (Array.isArray(c)) c.forEach((it, i) => { if (isRec(it)) items.push({ key: String(pick(it, ['code', 'codigo', 'canonicalId', 'id']) ?? ''), item: it }); else if (i < 0) return; });
    else if (isRec(c)) for (const [k, it] of Object.entries(c)) items.push({ key: isRec(it) ? String(pick(it, ['code', 'codigo', 'canonicalId', 'id']) ?? k) : k, item: isRec(it) ? it : { value: it } });
    if (items.length) break;
  }
  const values = new Map<string, number | null>();
  const codeRe = /^IM\d{1,2}$/i;
  let remapped = 0, byName = 0;
  for (const { key, item } of items) {
    const raw = pick(item, ['percentage', 'value', 'porcentaje', 'valor', 'score', 'puntaje', 'pct', 'percent']);
    const val = toPct(raw);
    let target: string | null = null;
    if (codeRe.test(key.trim())) { target = migrateCode(key, schema); if (target) remapped++; }
    if (!target) { const d = defByName(key) ?? defByName(String(pick(item, ['name', 'nombre', 'title', 'titulo', 'label', 'indicator']) ?? '')); if (d) { target = d.id; byName++; } }
    if (!target) continue;
    if (!values.has(target) || (values.get(target) === null && val !== null)) values.set(target, val);
  }
  if (byName && !remapped) warnings.push('Indicadores identificados por nombre (sin código IM); no se aplicó re-mapeo de esquema.');
  return { values, found: values.size };
}

const stripTags = (h: string) => decodeEntities(h.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

/** Último recurso: rascar el texto del HTML buscando "Nombre del indicador … 75%". Se identifica por nombre canónico 4.0. */
export function scrapeLegacyHtml(html: string): { values: Map<string, number | null>; scenario: string | null } {
  const text = stripTags(html);
  const values = new Map<string, number | null>();
  const low = text.toLowerCase();
  const namesOf = (d: (typeof INDICATORS)[number]) => [d.label, ...d.aliases.filter((a) => a.length > 6).map((a) => a.replace(/_/g, ' '))];
  const starts: number[] = [];
  for (const d of INDICATORS) for (const n of namesOf(d)) { const k = low.indexOf(n.toLowerCase()); if (k !== -1) starts.push(k); }
  for (const d of INDICATORS) {
    for (const n of namesOf(d)) {
      const i = low.indexOf(n.toLowerCase());
      if (i === -1) continue;
      const from = i + n.length;
      const next = Math.min(...starts.filter((k) => k > i), from + 320);
      const win = text.slice(from, next);
      const m = /(-?\d+(?:[.,]\d+)?)\s*%/.exec(win);
      if (m) { values.set(d.id, toPct(m[1])); break; }
      if (/\bs\/e\b/i.test(win.slice(0, 40))) { values.set(d.id, null); break; }
    }
  }
  const sm = /(?:Simulador|Escenario)\s*:\s*([^<\r\n\t|]+)/i.exec(text);
  return { values, scenario: sm ? sm[1].trim() : null };
}

export interface NormalizeOptions { fileName?: string; documentText?: string; /** El payload ya está en códigos canónicos 4.0 (p. ej. app_report_parsed guardado por la app original). */ canonical?: boolean }

/**
 * Normaliza cualquier reporte (esquema original / 3.0 / 4.0, o HTML heredado) al modelo canónico 4.0.
 * Empareja por código (nunca por posición), traduce códigos según la versión, deja los ausentes en null
 * y recalcula siempre los índices. Nunca lanza por payload incompleto.
 */
export function normalizeReport(payload: Json, fileNameOrOpts?: string | NormalizeOptions): AppReportParsed {
  const opts: NormalizeOptions = typeof fileNameOrOpts === 'string' ? { fileName: fileNameOrOpts } : fileNameOrOpts ?? {};
  const warnings: string[] = [];
  const root: Rec = isRec(payload) ? payload : Array.isArray(payload) ? { indicators: payload } : {};
  const det = detectSchema(root);
  const { schema, explicit } = opts.canonical ? { schema: '4.0' as SchemaGen, explicit: true } : det;
  if (!explicit) warnings.push('El reporte no declara versión de esquema: se asumió el esquema original (códigos IM re-mapeados a 4.0).');
  else if (schema !== '4.0') warnings.push(`Reporte de esquema ${schema} convertido al esquema 4.0.`);

  let { values, found } = readIndicators(root, schema, warnings);
  let scraped = false;
  if (found === 0 && opts.documentText) {
    const sc = scrapeLegacyHtml(opts.documentText);
    if (sc.values.size) { values = sc.values; found = sc.values.size; scraped = true; warnings.push('Datos rescatados del texto del HTML (formato heredado sin JSON); revisa los valores.'); }
  }
  if (found === 0) warnings.push('El reporte no contiene indicadores reconocibles.');

  // Valores expresados como fracción (0–1) → porcentaje
  const nums = [...values.values()].filter((v): v is number => v !== null);
  if (nums.length && nums.every((v) => v <= 1) && nums.some((v) => v > 0 && v < 1)) { for (const [k, v] of values) if (v !== null) values.set(k, Math.round(v * 1000) / 10); warnings.push('Valores en escala 0–1 convertidos a porcentaje.'); }

  const indicators: AppReportIndicator[] = INDICATORS.map((d) => {
    const value = values.get(d.id) ?? null;
    const level = categorize(value);
    if (value === null) warnings.push(`Indicador ${d.id} sin evidencia (s/e).`);
    return { id: d.id, value, level, diagnosis: diagnose(value, level) };
  });

  const classRaw = pick(root, ['classNumber', 'class', 'clase', 'numeroClase', 'sesion', 'session']);
  const cn = classRaw !== undefined ? parseInt(String(classRaw).replace(/\D/g, ''), 10) : NaN;
  const idx = computeIndices(indicators);
  const appObj = pick(root, ['app']);
  const md = pick(root, ['metadata']);
  const mdr = isRec(md) ? md : {};
  const simulator = [isRec(appObj) ? pick(appObj, ['name', 'id']) : appObj, pick(root, ['application', 'simulatorName', 'appNameFromContent', 'appNameFromFilename', 'simulator_name', 'simulator', 'simulador', 'appName', 'source']), pick(mdr, ['application', 'simulatorName'])].find((x) => typeof x === 'string' && x.trim()) as string | undefined;
  const scenario = (pick(root, ['scenarioName', 'scenario']) ?? pick(mdr, ['scenarioName'])) as string | undefined;
  const part = pick(root, ['participant']);
  const studentName = (isRec(part) ? pick(part, ['name']) : undefined) ?? pick(root, ['participantName', 'studentName', 'student_name', 'student', 'estudiante', 'alumno', 'nombre']) ?? pick(mdr, ['studentName']);
  const metric = (keys: string[]) => { const v = pick(root, keys) ?? pick(mdr, keys); const x = parseFloat(String(v ?? '').replace('%', '')); return Number.isFinite(x) ? x : undefined; };
  const extras = { apropiacion: metric(['apropiacion', 'apropiación']), aciertos: metric(['aciertos', 'hits']), errores: metric(['errores', 'errors']), reflexiones: metric(['reflexiones', 'reflections']) };
  return {
    sourceVersion: scraped ? 'HTML heredado' : schema, version: 'V4',
    simulator: simulator ?? 'No resuelta', scenarioName: scenario ?? null,
    classNumber: Number.isFinite(cn) && cn >= 1 && cn <= 12 ? cn : null,
    studentName: typeof studentName === 'string' ? studentName : '',
    generatedAt: String(pick(root, ['dateGenerated', 'generatedAt', 'date', 'fecha', 'timestamp', 'exportedAt']) ?? new Date().toISOString()),
    indicators, ...idx, ...extras, warnings: [...new Set(warnings)], fileName: opts.fileName,
  };
}

/** Lee el contenido crudo (HTML/JSON, opcionalmente data: URL base64) e intenta rescatar el máximo posible. */
export function parseReportText(rawInput: string, fileName?: string): AppReportParsed {
  const text = decodeRawData(rawInput);
  let payload: Json;
  try { payload = extractPayload(text); } catch { payload = {}; }
  const rep = normalizeReport(payload, { fileName, documentText: text });
  const sm = /(?:Simulador|Escenario)\s*:\s*([^<\r\n\t]+)/i.exec(text);
  if (sm && !rep.scenarioName) rep.scenarioName = sm[1].replace(/<[^>]+>/g, '').trim();
  return rep;
}

export async function parseReportFile(file: File): Promise<AppReportParsed> {
  return parseReportText(await file.text(), file.name);
}
