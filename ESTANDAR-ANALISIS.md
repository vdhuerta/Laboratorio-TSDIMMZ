# Estándar de «Análisis Metacognitivo» (las 5 apps)

Tomado de `MetacognitiveDashboard.tsx` de Rutinas Matematizadas. Código: `src/analysis/` (`standard.ts` = tipos y orden, `tsdConfig.ts` = lo propio de cada app, `model.ts` = datos, `AnalysisParticipant.tsx` = pantalla) y el cuerpo del reporte en `src/lib/immzReport.ts`. Pantalla y reporte salen del MISMO modelo.

## Orden fijo (pantalla → reporte)
| # | Bloque | Caja |
|---|---|---|
| 0 | Encabezado: «Módulo de Evaluación Formativa Digital - <App>», título, botón «Descargar Reporte HTML» con nombre obligatorio; pestañas | — |
| 1 | Apropiación Teórica (exactitud · eficiencia · reflexión) | rounded-3xl, barra superior índigo |
| 2 | Medidor circular IMMG + texto explicativo | 1/3 + 2/3 |
| 3 | DIMENSIÓN 1 Monitoreo Metacognitivo — IMMZ-AO · IMMZ-AC · IMMZ Global → Veredicto → **A1 Autoobservación (IM1, IM2)** → **A2 Autocontrol (IM3, IM4, IM5)** | rounded-3xl; subcabecera índigo con IMMZ-AO / IMMZ-AC y nivel |
| 4 | DIMENSIÓN 2 (propia de la app) — sub-índice → Veredicto → IM6…IM10, sin subdimensiones | rounded-3xl, tono esmeralda |
| 5 | Mapeo DigCompEdu Área 4 (4.1, 4.2, 4.3) | tabla |
| 6 | Reporte: bloques propios de la app (aquí: hoja de trabajo + bitácora) → Fundamentación teórica | — |

Ficha de indicador: ícono · nombre «IMx. …» · marco teórico · % + nivel · descripción · (chip de desglose) · barra · «Diagnóstico Cualitativo» · «Ver Fórmula y Tip Didáctico» (Fórmula de Monitoreo / Marco de Referencia / Tip Orientador).
Resumen del reporte (5 tarjetas): Participante · Apropiación · IMMG · Sub-índices (AO, AC, IMMZ, IDCD) · tarjeta propia de la app.
Encabezado del REPORTE HTML descargable (fijo, idéntico en las 5 apps): título **«Análisis Metacognitivo»**, con el ícono de actividad, código de certificado y fecha arriba a la derecha; subtítulo **«Evaluación del proceso de autorregulación y desempeño didáctico &lt;app&gt;»** (`cfg.reportSubtitle`, p. ej. «… TSD» en Laboratorio TSD). No usar `cfg.title` aquí — ese campo es solo para el texto de pantalla.

## Qué cambia por app (y solo eso)
`AppAnalysisConfig`: nombre del módulo, Dimensión 2 (título, sub-índice), textos/fuentes/tips/fórmulas de IM1–IM10, pesos de la apropiación, filas DigCompEdu, fundamentación, y en `metrics.ts` las fórmulas de cada IM.
En Laboratorio TSD: Dim. 2 = «Competencia Didáctica TSD (Brousseau)» · IDCD · apropiación 50/25/25 · IM6 «Secuencia Adidáctica».
En Rutinas: Dim. 2 = «Matematización de Rutinas de Cuidado» · ICMR (en el payload va como `idcd`) · apropiación 50/30/20 · IM6 «Secuencia de la Jornada» · tarjeta extra IMD.

## Diferencias detectadas en Rutinas (a resolver cuando se migre)
- Sin evidencia devuelve **100** en varios IM (vigilancia, autocorrección, ensayo, reflexiva, predictiva, resiliencia, formulación); el estándar devuelve **null** (el Diario no cuenta null como 0). Con 100 se infla el IMMZ.
- Insignias en 3 niveles (Maduro/En desarrollo/Inicial); el Diario usa 4 (Inicial <40, En Desarrollo <60, Competente <80, Avanzado). El estándar usa los del Diario.
- Su payload no trae `class_number`, `participant`, `apropiacion` ni `aciertos/errores/reflexiones` en las claves que lee el parser, y `indices` va anidado: aplicar `CONTRATO-IMMZ.md`.

## Presentación en pantalla (versión actual)
- Título del componente dentro de una caja (`card` con franja verde, ícono con esquina ámbar, módulo · «Análisis del Participante» · subtítulo, botones a la derecha).
- Botón: **«Descargar Análisis IMMZ (HTML)»** (+ PDF).
- Pestañas con el control segmentado del Diario (activa = verde institucional): Resumen · Dimensión 1 · IMMZ · Dimensión 2 · IDCD · DigCompEdu y Fundamento · Hoja de Trabajo. El reporte HTML mantiene el orden lineal.
- Colores: cromo = verde `#24473A` + ámbar `#C98F2D` sobre neutros cálidos; datos = índigo (Dim. A) y celeste (Dim. B) como en `ImmzPreview` del Diario; niveles con `catStyle` del Diario. Botones `.btn-primary/.btn-ghost`, etiquetas `.micro` (10 px), tablas 10 px, solo títulos en negrita.
- KPI de la Dimensión 1 (IMMZ-AO, IMMZ-AC, IMMZ Global) y de la Dimensión 2: mismo ancho (`w-32`; en el reporte, 3 columnas iguales).
- «Hoja de Trabajo»: 5 KPI con ícono (Apropiación, Aciertos, Errores, Movimientos, Devoluciones); el reporte los incluye con SVG inline en la sección «Hoja de trabajo y clasificación didáctica».
- Devolución didáctica: el encabezado muestra solo la letra de la fase (A Acción, B Formulación, C Validación, D Institucionalización) para no dar la respuesta.
- Regla de contenido: ninguna app ni el Diario lleva referencias escritas a la tesis (marco, título, autor) en pantalla ni en los reportes.
