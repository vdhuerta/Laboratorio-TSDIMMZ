# ESTÁNDAR IM2 · Autoobservación (versión 2)

Documento de revisión para las 5 apps. Complementa a `ESTANDAR-ANALISIS.md` (que fija el orden y el diseño del Análisis Metacognitivo) y a `CONTRATO-IMMZ.md` (que fija el formato del reporte). Este documento fija **qué mide IM2, cómo se calcula y qué debe registrar cada app para poder calcularlo igual en todas**.

Estado: **versión 2 implementada en Laboratorio TSD** (`scoring_version: 2`, módulo `src/lib/metrics.ts`, prueba `scripts/test-im2.ts`). Las otras 4 apps siguen en versión 1 y no se tocan (ver sección 9).

---

## 1. Qué mide IM2

IM2 pertenece a la subdimensión **AO · Autoobservación** (IM1–IM2). Mientras IM1 mide el *ritmo* de la acción (pausas entre colocaciones), IM2 mide si el participante **se detiene a observar y comprobar su trabajo usando los apoyos que la app le ofrece**.

> **IM2 = proporción de unidades de trabajo en las que el participante realizó al menos un acto de detención reflexiva.**

La versión 1 dividía los actos reflexivos por el total de colocaciones y retiros. Eso castigaba a quien manipulaba más, no a quien reflexionaba menos, y dejaba el indicador cerca de 0 aunque hubiera reflexión. La versión 2 mide **cobertura**: en cuántas unidades de trabajo hubo reflexión, sin importar cuántas piezas se movieron.

## 2. Conceptos

| Término | Definición |
|---|---|
| **Unidad de trabajo (UT)** | La parte mínima de la tarea que la app valida de forma independiente (carril, ruta, patrón, rutina, caso). Cada app declara su UT en la sección 7. |
| **UT trabajada** | UT con al menos una manipulación (`place` o `remove`) en la traza. |
| **Manipulación** | Evento que cambia la construcción: colocar o retirar. |
| **Acto reflexivo (AR)** | Evento de detención reflexiva, de uno de los tipos de la sección 3. |
| **Acto de actividad** | AR que no pertenece a una UT concreta (p. ej. abrir una pregunta de formulación). |

## 3. Qué cuenta como acto reflexivo

Vocabulario canónico (cada app mapea sus eventos a estos nombres, ver sección 7):

| Código | Acto | Nivel | Condición para contar |
|---|---|---|---|
| `AR-EXP` | Uso del espacio de exploración (Experimenta o equivalente) | UT, por atribución temporal | Episodio con **al menos una pieza usada**. Abrir y cerrar sin usar no cuenta. Piezas con < 60 s entre sí forman **un** episodio. |
| `AR-DEV` | Devolución didáctica de la construcción | UT, directo | Se solicita (`devolution_request` con `scope: "construction"` y `unitId`). Cuenta al solicitar, no al abrir la ventana. |
| `AR-ACT` | Apoyo de actividad: formulación abierta, anclaje abierto, devolución de formulación/anclaje, Mirada didáctica | Actividad | Evento registrado en esa actividad. |

**No cuentan** (para no duplicar otros indicadores):

- Respuestas escritas → ya las mide **IM10**.
- Pausas entre colocaciones → ya las mide **IM1**.
- Retiros tras un error → ya los mide **IM3**.
- Reajuste posterior a una devolución → ya lo mide **IM4**. (La devolución cuenta en IM2 por *pedirla* y en IM4 por *aplicarla*; es intencional.)

## 4. Atribución de un acto a una UT

1. Si el evento trae `unitId` (caso `AR-DEV` con carril), pertenece a esa UT.
2. Si no lo trae (`AR-EXP`, o `AR-DEV` sin carril como «punto de partida» o «construcción completa»), se atribuye así, dentro de la misma actividad:
   - a la UT de la **primera manipulación en los 180 s siguientes** (la reflexión prepara la acción);
   - si no hay ninguna, a la UT de la **última manipulación en los 120 s anteriores** (la reflexión revisa lo hecho);
   - si tampoco, el acto queda **sin atribuir** y no da crédito a ninguna UT.
3. Varios actos sobre la misma UT cuentan **una vez**.

Los umbrales (`W_AFTER = 180 s`, `W_BEFORE = 120 s`, `EPISODE_GAP = 60 s`) viven en una constante al inicio del módulo de métricas, igual que `IM1_MIN_MS`.

## 5. Fórmula

Para cada UT trabajada *u*, de la actividad *a*:

```
crédito(u) = 1     si u tiene al menos un AR-EXP o AR-DEV atribuido
           = 0,5   si no, pero la actividad a tiene al menos un AR-ACT
           = 0     en otro caso

IM2 = round( 100 × Σ crédito(u) / |UT trabajadas| )        (entero 0–100)
IM2 = null si |UT trabajadas| = 0                           (sin evidencia, nunca 0)
```

Notas:

- Se calcula igual para el reporte global y por actividad (`scope`), restringiendo las UT a la actividad.
- `numerator = Σ crédito` (un decimal) y `denominator = |UT trabajadas|` van en la evidencia del indicador.
- La retroalimentación cualitativa conserva las tres bandas del estándar (≥ 80, 50–79, < 50) y su `none` para `null`.

## 6. Lo que cada app debe registrar

Cada evento de la traza (`tsd-report-raw-data`) debe tener, como mínimo:

```
{ id, timestamp, activity, type, unitId?, payload? }
```

- `unitId`: identificador de la UT (en Laboratorio TSD es `laneIndex`). Obligatorio en `place`, `remove`, `validation_success` y `devolution_request` de construcción.
- `type` canónico (o mapeo documentado): `place`, `remove`, `test_area_use`, `devolution_request`, `question_open`, `anchor_open`, `didactic_view`.
- `devolution_request` de construcción: `payload.scope = "construction"`, `payload.key`, `payload.case`.
- Todas las marcas de tiempo en milisegundos, del mismo reloj.

Y debe añadir al reporte:

```json
"scoring": { "version": 2, "im2": { "unit": "carril", "units_worked": 18, "credit": 14.5, "detail": [ { "activity": "TSD1", "unit": 3, "credit": 1, "acts": ["AR-EXP"] } ] } }
```

`detail` es opcional en el payload canónico pero **obligatorio en la traza cruda**, para poder auditar cada cálculo.

## 7. Mapeo por app

> Solo Laboratorio TSD está confirmado. Las otras cuatro son **propuestas a verificar** al revisar cada código.

| App | Clase | Unidad de trabajo | AR-EXP | AR-DEV | AR-ACT | Estado |
|---|---|---|---|---|---|---|
| Laboratorio TSD | 9 | Carril (10 + 4 + 4 = 18) | Experimenta | Botón «Devolución» (registra carril y nivel) | Formulación, Anclaje, Mirada didáctica | **v2 implementada** |
| Simulador TSD | 1 | A confirmar (¿situación/etapa?) | A confirmar | A confirmar | A confirmar | Por revisar |
| Constructor de Trayectorias | 2 | A confirmar (¿trayectoria/tramo?) | A confirmar | A confirmar | A confirmar | Por revisar |
| Rutinas Matematizadas | 6 | A confirmar (¿rutina/momento?) | A confirmar | A confirmar | A confirmar | Por revisar |
| PatternStudio | 7 | A confirmar (¿patrón/nivel?) | A confirmar | A confirmar | A confirmar | Por revisar |

Regla para elegir la UT: debe ser algo que **la app ya valida por separado** y que el participante puede reconocer como «una cosa terminada». Si una app no tiene un espacio de exploración o devoluciones en construcción, no se inventa evidencia: IM2 se calcula solo con lo que existe, y la ausencia se documenta aquí.

## 8. Casos de prueba (deben dar el mismo resultado en todas las apps)

Tres UT trabajadas, una sola actividad.

| Caso | Traza | Cálculo | IM2 |
|---|---|---|---|
| A | Exploración antes de la UT 1; nada en 2; devolución de la UT 3 | (1 + 0 + 1) / 3 | **67** |
| B | Igual que A, más abrir una pregunta de formulación | (1 + 0,5 + 1) / 3 | **83** |
| C | Sin ningún acto reflexivo | 0 / 3 | **0** |
| D | Ninguna manipulación | sin UT trabajadas | **null** |
| E | Abrir Experimenta sin usar piezas, y devolución pedida 3 veces en la misma UT | solo la UT con devolución cuenta, una vez | UT con crédito 1 |
| F | Exploración 5 min antes de la primera colocación | fuera de ventana (> 180 s): sin atribuir | 0 si no hay otro acto |
| G | 60 colocaciones en 3 UT y 1 exploración antes de cada una | (1 + 1 + 1) / 3 | **100** (la v1 daba ≈ 5) |

## 9. Versionado y migración

1. **Aplicada solo en Laboratorio TSD.** Los reportes ya entregados por las otras apps usan la versión 1; esas apps no se modifican.
2. Cada reporte declara `scoring.version`. Los reportes sin ese campo se consideran versión 1.
3. Las otras 4 apps pasan a la versión 2 cuando el autor lo decida.
4. Como la traza cruda guarda marcas de tiempo y `unitId`, los reportes con eventos suficientes pueden **recalcularse** con un script aparte. Los reportes anteriores al botón de devolución no tendrán `AR-DEV`, y eso debe constar en el análisis.
5. Mientras tanto, la app puede guardar en la traza cruda el IM2 v2 *calculado en paralelo*, sin tocar el valor oficial, para comparar cohortes.

## 10. Lista de revisión por app

- [ ] Declara su unidad de trabajo y cuántas UT tiene.
- [ ] Todos los `place`/`remove` llevan `unitId`.
- [ ] El espacio de exploración registra `test_area_use` con marca de tiempo.
- [ ] Existe un modo de pedir ayuda **durante** la construcción y registra `devolution_request` con `scope: "construction"` y `unitId`.
- [ ] Pedir ayuda antes de actuar **no** penaliza IM6 cuando es devolución de construcción.
- [ ] Las respuestas escritas no se cuentan en IM2.
- [ ] `null` cuando no hay UT trabajadas; nunca 0 por defecto.
- [ ] Umbrales en constantes al inicio de `metrics`.
- [ ] El reporte trae `scoring.version` y el detalle por UT en la traza cruda.
- [ ] Pasa los 7 casos de la sección 8.

## 11. Decisiones que quedan para el autor

1. **Crédito parcial de 0,5** por apoyos de actividad: ¿se mantiene, o solo cuenta lo atribuido a la UT?
2. **Ventanas** de 180 s y 120 s: ¿se calibran con datos del semestre?
3. **UT de las otras cuatro apps** (sección 7).
4. **Recalcular** los reportes del semestre con la versión 2, o dejarlos en versión 1 y reportar ambas cohortes por separado.
