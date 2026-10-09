# Laboratorio TSD (Puente del Castillo) · conectado al IMMZ del Diario de Campo

App `laboratorio_tsd`, **Clase 9** del Diario. React 18 + TS + Tailwind 3 + Vite.

- `npm install && npm run dev` · `npm run build` · `npm run build:single` (un solo HTML).
- Reporte: `Reporte_LabTSD_<Nombre>_<ID>.html` (esquema 4.0, ver CONTRATO-IMMZ.md). Trazas crudas en el segundo bloque JSON.
- Indicadores IM1–IM11 calculados por **immz-core** (`src/immz-core/`, copia idéntica de la del Simulador TSD: no se edita aquí). `src/lib/metrics.ts` solo traduce la interfaz a eventos canónicos. Sin evidencia = null.
- Estructura: UNA sesión de 18 carriles (10 / 4 / 4), no tres formas paralelas. TSD1 = escalera de 10 escalones (cada uno con UNA regleta; metas 1..10 declaradas en `Escalon`), TSD2 = un puente de 4 vías (metas entre 5 y 7), TSD3 = una cerca de 4 lados, perímetro 12 (cada pista declarada con su `registro`). Ninguna meta ni patrón se deduce de la posición del carril.
- Formas A/B/C = tres versiones numéricas de la misma sesión (`FORMAS` en `src/data/lab.ts`, selector en Configuración). Están cargadas A, B y C. TSD2: cuatro vías de 5 (A), 6 (B) y 7 (C) unidades. Inventario por defecto: 6 regletas de cada largo (editable en Configuración). Perfil de registros de la cerca, común a todas: L1 multiplicativo «k veces m», L2 algebraico «an+b», L3 duplicación «doble de X más Y» = {X,X,Y}, L4 comparación aditiva «dos números que se diferencian en d» = {a, a+d}. Perímetro 12 y 11 piezas en cada forma (`opportunity_target.piezas_cerca`).
- Decisión documentada: en las formas B y C la actividad TSD1 mide **aplicación** de la correspondencia número–regleta, no su emergencia (la correspondencia ya emergió en la primera aplicación). No se resuelve con código: es una decisión de diseño de la investigación.
- Pruebas: `npx tsx scripts/test-im2.ts` (traducción + núcleo), `npm run build`, `node scripts/e2e.mjs` (con `vite preview` en 4173).
- Pruebas: `node scripts/e2e.mjs` (con `npm run preview` activo), `npx tsx scripts/selfcheck.ts <reporte.html>`, y `DIARIO_SRC=/ruta/diario/src npx tsx scripts/verify-immz.ts <reporte.html>` contra el código real del Diario.
- PIN de administrador: ver `src/config.ts`.

## TSD3 · lado L3 «doble de X más Y»
Se acepta tanto la lectura {X,X,Y} como {2X,Y} (campo `equivalentes` en `LadoCerca`, src/data/lab.ts). Forma A: [1,1,10] o [2,10]; forma B: [2,2,8] o [4,8]. `piezas_cerca` cuenta el patrón principal (11).

## IM10 · rúbricas por grupos de términos (src/data/expected.ts)
Cada una de las 6 preguntas (P1–P4 de TSD1, anclaje TSD2 y TSD3) tiene 4 grupos de términos equivalentes (`RUBRICAS`, `minimoGrupos: 3`). La respuesta es correcta si toca ≥3 grupos distintos. Comparación: minúsculas, sin tildes, «1» = «uno» = «una», coincidencia por raíz («descomponer» ≈ «descomposición») y un mismo fragmento del texto no acredita dos grupos. Limitación: los verbos irregulares («convertir» → «convierte») no comparten raíz; si hace falta, se agregan como término. Payload de `question_answer`: `groups_touched`, `groups_missing`, `groups_min`, `terms_hit` (solo descriptivo, para revisar si una rúbrica es demasiado exigente). El reporte trae `grupos_tocados`, `grupos_no_tocados`, `terminos_acreditados`.
Pruebas: `npx tsx scripts/test-rubricas.ts` (3 respuestas por pregunta). Auditoría de devoluciones: `npx tsx scripts/check-devoluciones.ts` (ninguna devolución debe contener términos de su propia rúbrica).

## IM11 · ficha y presentación
La ficha de IM11 (name, authors, description, tip) vive en `src/analysis/labConfig.ts` como las de IM1–IM10 y se declara en `INDICATORS` (`src/config.ts`: dimensión A, sub AO). El reporte y la pantalla toman los indicadores desde `INDICATORS` (sin lista fija), de modo que IM11 aparece en Autoobservación junto a IM1 e IM2. El pie de la Dimensión 1 aclara que IM11 pertenece al bloque 4.1 y que el Diario de Campo, mientras no se actualice, calcula los índices sin él. El bloque de compatibilidad 4.0 sigue sin IM11 (`COMPAT_4_0_IDS`).

## Identificación del curso (NRC + forma)
En el primer inicio un modal bloqueante pide NRC (3 a 6 dígitos) y forma (A/B/C, sin preselección); no se vuelve a pedir. Se guarda en localStorage: `lab_nrc`, `lab_form_id`, `lab_form_set` (fecha ISO). Solo se cambian desde Configuración (PIN), con advertencia. Si la forma guardada no existe en `FORMAS` (src/data/lab.ts), el modal reaparece con error. La forma elige a la vez las metas de la escalera, la distribución de las vías del puente y las pistas/patrones de la cerca. Payload (raíz): `nrc`, `form_id`, `content_level`, `content_id` (sin `forms[]`); el pie del reporte muestra «NRC … · Forma …». Pantalla inicial y barra superior muestran «NRC nnn · Forma X». Las formas A, B y C están cargadas (PROPUESTA-FORMAS-B-C.md).

Al «Reiniciar todo» se borra también la identificación (`lab_nrc`, `lab_form_id`, `lab_form_set`) y la app vuelve a pedir NRC y forma, sin preselección. El rótulo «NRC nnn · Forma X» cuelga bajo el título de la barra superior. Prueba: `node scripts/e2e-identity.mjs`.

## TSD1 · orientación de la escalera
La escalera se arma de abajo hacia arriba, de la regleta más grande a la más pequeña, y es **idéntica en las formas A, B y C**: Escalón 1 (abajo) = 10 … Escalón 10 (arriba) = 1. El «ojo» valida del mismo modo en las tres. Las formas se diferencian solo en TSD2 (distribución de vías) y TSD3 (pistas y patrones de la cerca). Esto reemplaza la especificación anterior, en la que TSD1 variaba de orden por forma, por decisión explícita del investigador.
