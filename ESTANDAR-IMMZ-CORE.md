# Laboratorio TSD · adopción de immz-core (IMMZ 4.1)

`src/immz-core/` es copia **byte a byte** de la del Simulador TSD (`scripts/test-im2.ts` compara los sha1). Las fórmulas y constantes (pausa 5–60 s, ventana de uptake 5 min, etc.) viven allí; esta app no las redefine.

## Traducción de la interfaz (src/lib/metrics.ts)
| Interfaz | Evento canónico |
|---|---|
| Un carril (escalón, vía o lado), id `TSD1:6` | `unidad` |
| Colocar / retirar una regleta | `intento` (place: acierto = cabe y no arma un lado mal compuesto; remove: acierto salvo que desarme un carril correcto; `primerIntento` = primer intento que lleva el carril a su meta) |
| Tiempo entre dos intentos de la misma actividad | `pausa` |
| **Abrir el panel** de Devolución didáctica con una situación que tiene carril | `devolucion` (retirar una pieza NO lo es; sin carril no se emite) |
| Colocar tras una devolución en el mismo carril | `revision` — **la deriva el núcleo**, la app no la emite |
| Cambio TSD1/TSD2/TSD3; primera acción, primera ayuda y primera formulación de cada actividad | `fase` (`esSalto`: avanzar dejando incompleta la anterior; pedir ayuda antes de actuar; anclaje escrito antes de completar) |
| Colocar y retirar de inmediato la misma regleta del mismo carril | `redundante` |
| Última respuesta de cada pregunta de formulación/anclaje | `formulacion` (`modo:'texto'`, `correcta`, y `caracteres`/`palabras` como dato descriptivo) |
| «¿Crees que este carril está completo y correcto?» (Sí/No) | `juicio` |

## IM10 = corrección
`src/data/expected.ts` define, por pregunta, grupos de términos clave (la respuesta es correcta si cumple todos los grupos `required`). **Son provisionales y deben validarse con la autora.** La habilitación de preguntas y el acceso a TSD 2/3 siguen exigiendo una respuesta con contenido (≥ 25 caracteres, ≥ 4 palabras) y NO dependen de la corrección. Denominador de IM10: las formulaciones que ofrece la forma (4 / 1 / 1) una vez que hubo contacto con alguna.

## IM11
Se pregunta cuando una pieza lleva el carril a su meta (o más allá). No se pregunta con el «ojo» activo ni si el docente apagó el juicio (Configuración). Cerrar el modal sin responder no registra juicio.

## Formas paralelas (opción a)
La sesión completa (TSD1 + TSD2 + TSD3) es UNA aplicación: 18 carriles (10 / 4 / 4), 18 devoluciones y 6 formulaciones disponibles (`opportunity_target`, idéntico en las tres formas). La forma (A/B/C) es de la **sesión**: `form_id`, `content_level` y `content_id` van a nivel de payload (no hay `forms[]`). `session_form` declara el contenido numérico aplicado (metas de los escalones con su rótulo, metas de las vías, y los lados de la cerca con su registro, pista y patrón). Lo que se conserva entre formas: 10/4/4 carriles, metas 1..10 en TSD1, metas de las vías en {5,6,7}, perímetro 12 y el perfil de registros de los lados (L1 multiplicativo, L2 algebraico, L3 duplicación, L4 comparación aditiva), 11 piezas en la cerca (`opportunity_target.piezas_cerca`). Lo que varía: el orden de las metas de TSD1, la distribución de metas entre las vías y las pistas/patrones de la cerca.

Nota: `session_form.cerca[].equivalentes` lista las descomposiciones alternativas válidas de un lado (L3: {X,X,Y} y {2X,Y}).

Nota IM10: `formulacion.correcta` = (grupos tocados ≥ `minimoGrupos`=3 de 4) según `src/data/expected.ts`; el payload de `question_answer` agrega `groups_touched`/`groups_missing`/`terms_hit` como dato descriptivo.
