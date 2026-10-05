# Contrato de reporte IMMZ 4.0 (Diario de Campo ⇄ apps de clase)

Válido para las 5 apps (Laboratorio TSD, Constructor de Trayectorias, Rutinas Matematizadas, Laboratorio TSD, PatternStudio).
La implementación de referencia es `src/lib/immzReport.ts`; `src/lib/metrics.ts` traduce la traza a eventos canónicos y `src/immz-core/` calcula IM1–IM11 (ver `ESTANDAR-IMMZ-CORE.md`). IM11 y la declaración de formas viajan en el bloque 4.1 (`immz41`, `forms`, `opportunity_target`), fuera del arreglo `indicators`.

## Reglas
1. **El primer `<script type="application/json">` del HTML es el payload canónico** (`id="bct-report-payload"`). El parser del Diario toma el primero que encuentra; las trazas crudas van en un segundo bloque (`id="tsd-report-raw-data"`).
2. **Indicadores por código `IM1…IM10`** del esquema 4.0 (`{code, value}` con `value` 0–100 o `null` = sin evidencia). Nunca por nombre ni por posición.
3. **Claves que el parser normaliza** (deben estar en la raíz): `schema_version`/`schemaVersion` = `"4.0"`, `app:{id,name}` (name = nombre exacto de `DEFAULT_APP_CONFIGS`), `class_number`/`classNumber`, `participant:{name}`, `scenarioName`, `generatedAt`, `apropiacion`, `aciertos`, `errores`, `reflexiones`.
4. **Índices con el mismo scoring del Diario**: media simple de los indicadores con evidencia, 1 decimal (`src/lib/immz/scoring.ts` es copia exacta). IMMZ = media(IM1–IM5), AO = IM1–2, AC = IM3–5, IDCD = IM6–10, IMMG = media(IM1–10). Categorías: <40 Inicial, <60 En Desarrollo, <80 Competente, ≥80 Avanzado.
5. **Nombre de archivo**: `<filenamePrefix><Nombre>_<ID>.html`. Prefijos por defecto: `Reporte_LabTSD_`, `Reporte_TrayectoriasPG_`, `Reporte_Rutinas_`, `Reporte_LabTSD_`, `Reporte_PStudio_`.
6. **Clase**: declarar la clase configurada para la app (Laboratorio TSD = 1). Si la administración la cambia en el Diario, hay que cambiarla aquí (Config → PIN) o dejarla «no declarar»; si no coincide, el auditor marca R2/R11.
7. **Etiquetas visibles = etiquetas canónicas** (`INDICATORS[].label`), para que el rescate por texto del parser funcione si faltara el JSON.

## Cómo probar cualquier app
```
DIARIO_SRC=/ruta/diario-campo/src npx tsx scripts/verify-immz.ts Reporte_XXX.html
```
Ejecuta el parser, `auditEntry` (R1–R11) y `narrateImmz` ORIGINALES del Diario y compara cada indicador, índice, clase, nombre, APP y métricas contra el payload.
