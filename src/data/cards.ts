export enum TSDPhase {
  ACTION = 'action',
  FORMULATION = 'formulation',
  VALIDATION = 'validation',
  INSTITUTIONALIZATION = 'institutionalization',
}

export interface Card {
  id: string;
  type: 'Consigna' | 'Material' | 'Rol Docente' | 'Pregunta Guía';
  content: string;
  correctPhase: TSDPhase;
  justification?: string;
  devolutionFeedback?: string;
}

export const PHASES_CONFIG = {
  [TSDPhase.ACTION]: {
    title: 'Fase de Acción',
    letter: 'A',
    short: 'Acción',
    description: 'El estudiante actúa sobre el medio sin intervención directa del docente. Aprende por ensayo y error.',
    tone: 'sky',
  },
  [TSDPhase.FORMULATION]: {
    title: 'Fase de Formulación',
    letter: 'B',
    short: 'Formulación',
    description: 'El estudiante necesita comunicar su estrategia a otros. Debe explicitar sus conocimientos.',
    tone: 'brand',
  },
  [TSDPhase.VALIDATION]: {
    title: 'Fase de Validación',
    letter: 'C',
    short: 'Validación',
    description: 'El estudiante debe probar que su solución es correcta. Argumenta y defiende su estrategia.',
    tone: 'accent',
  },
  [TSDPhase.INSTITUTIONALIZATION]: {
    title: 'Fase de Institucionalización',
    letter: 'D',
    short: 'Institucionalización',
    description: 'El docente formaliza el conocimiento construido y lo conecta con el saber oficial.',
    tone: 'indigo',
  },
} as const;

/** Clases Tailwind por tono (paleta del Diario de Campo). */
export const PHASE_TONES: Record<string, { dot: string; text: string; ring: string; soft: string; bar: string }> = {
  sky: { dot: 'bg-sky-500', text: 'text-sky-700', ring: 'border-sky-200', soft: 'bg-sky-50', bar: 'bg-sky-500' },
  brand: { dot: 'bg-brand-400', text: 'text-brand-500', ring: 'border-brand-200', soft: 'bg-brand-50', bar: 'bg-brand-400' },
  accent: { dot: 'bg-accent', text: 'text-amber-700', ring: 'border-amber-200', soft: 'bg-accent-soft', bar: 'bg-accent' },
  indigo: { dot: 'bg-indigo-500', text: 'text-indigo-700', ring: 'border-indigo-200', soft: 'bg-indigo-50', bar: 'bg-indigo-500' },
};

/**
 * FORMA A — contenido original del simulador, sin modificar.
 * 16 tarjetas: 4 fases × 4 tipos (Consigna, Material, Rol Docente, Pregunta Guía).
 */
const FORMA_A_CARDS: Card[] = [
  // ACTION
  {
    id: 'c1',
    type: 'Consigna',
    content: '"Tienes 20 monedas para comprar productos del almacén. Intenta gastar exactamente lo que tienes."',
    correctPhase: TSDPhase.ACTION,
    justification: 'La consigna de la fase de acción debe ser abierta y permitir la exploración libre. El estudiante interactúa directamente con el medio (monedas y precios) sin instrucciones detalladas sobre cómo resolver.',
    devolutionFeedback: 'Esta es una consigna abierta para la exploración inicial del problema. Si se coloca de forma tardía, se interrumpe el libre tanteo del "milieu". No permitir que el alumno explore por sí mismo desde el inicio impide que asuma la responsabilidad de resolver y experimente el fracaso o reajuste de manera autónoma.',
  },
  {
    id: 'c5',
    type: 'Material',
    content: 'Fichas/monedas de plástico y carteles con precios de productos',
    correctPhase: TSDPhase.ACTION,
    justification: 'Los materiales de acción deben permitir la manipulación directa y el ensayo-error. Las monedas y precios conforman el "milieu" donde el estudiante aprende por retroalimentación del medio.',
    devolutionFeedback: 'Este recurso material conforma el "milieu" sobre el que el estudiante actúa directamente. Ubicarlo de forma tardía confunde la manipulación empírica inicial con la argumentación teórica o la formalización abstracta. El estudiante debe interactuar libremente con estos objetos en la etapa de partida para generar sus propias estrategias de resolución.',
  },
  {
    id: 'c13',
    type: 'Rol Docente',
    content: 'Observar sin intervenir. Dejar que los estudiantes experimenten libremente.',
    correctPhase: TSDPhase.ACTION,
    justification: 'En acción, el docente debe mantenerse al margen para preservar la situación adidáctica. La retroalimentación debe venir del medio, no de la corrección del profesor.',
    devolutionFeedback: 'En esta etapa, el docente debe mantenerse al margen para preservar la naturaleza adidáctica del problema. Colocar este rol de abstención en otros momentos dejaría a los estudiantes sin la mediación o moderación necesarias para confrontar ideas, o bien impediría la indispensable formalización final.',
  },
  {
    id: 'c17',
    type: 'Pregunta Guía',
    content: '¿Qué pasa si eliges este producto? ¿Te alcanza el dinero?',
    correctPhase: TSDPhase.ACTION,
    justification: 'Estas preguntas de acción dirigen la atención hacia el medio sin dar la respuesta. El estudiante debe verificar por sí mismo mediante la manipulación de las monedas.',
    devolutionFeedback: 'Este tipo de pregunta impulsa al estudiante a confrontar el milieu material y verificar de forma autónoma. Ubicarla fuera de su lugar desvía el foco de la argumentación colectiva o la creación de códigos compartidos, regresando a una simple comprobación empírica.',
  },

  // FORMULATION
  {
    id: 'c2',
    type: 'Consigna',
    content: '"Explica a tu compañero cómo decidiste qué productos comprar y por qué."',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'En formulación, el estudiante debe explicitar su estrategia para comunicarla a otros. Esta consigna obliga a verbalizar el proceso mental desarrollado en la fase anterior.',
    devolutionFeedback: 'Esta consigna exige la verbalización y creación de un lenguaje común para transmitir una estrategia. Si la adelantas demasiado, exiges una explicitación prematura cuando aún no se ha consolidado la práctica. Si la retrasas, pierdes el momento de debate entre pares antes de la intervención formal.',
  },
  {
    id: 'c14',
    type: 'Material',
    content: 'Hojas de registro para escribir la estrategia y diagramas',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'En formulación se necesitan materiales para registrar and comunicar. Las hojas de registro permiten externalizar el pensamiento y compartirlo con otros estudiantes.',
    devolutionFeedback: 'Este medio escrito permite externalizar y registrar el pensamiento para poder comunicarlo. Exigir este registro demasiado pronto interrumpe la fluidez de la experimentación libre y genera sobrecarga cognitiva, mientras que usarlo al final resulta tardío para la formalización oficial.',
  },
  {
    id: 'c10',
    type: 'Rol Docente',
    content: 'Facilitar la comunicación entre estudiantes. Pedir clarificaciones sin dar respuestas.',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'En formulación, el docente es mediador de la comunicación. Su rol es ayudar a hacer explícito lo implícito, sin imponer sus propias formulaciones.',
    devolutionFeedback: 'En este momento del proceso, el docente actúa como un facilitador que ayuda a hacer explícitos los saberes que aún están implícitos. Si asumes este rol de forma anticipada, saboteas la exploración autónoma; si lo dejas para el final, evades la responsabilidad de estructurar formalmente el saber construido.',
  },
  {
    id: 'c6',
    type: 'Pregunta Guía',
    content: '¿Cómo podrías explicar tu método para que otro lo entienda?',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'Esta pregunta de formulación obliga a explicitar el procedimiento. El estudiante debe reflexionar sobre su propio proceso para poder comunicarlo.',
    devolutionFeedback: 'Esta interrogante empuja al estudiante a construir un código o representación de su proceder. Si se realiza antes de tiempo, se fuerza una sistematización abstracta sin base empírica; si se posterga, resulta insuficiente porque se requiere comprobar lógicamente la validez de la solución.',
  },

  // VALIDATION
  {
    id: 'c3',
    type: 'Consigna',
    content: '"Demuestra a la clase que tu solución es correcta usando los precios del almacén."',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'La validación requiere demostrar la corrección de la solución. Esta consigna pide evidencia y argumentación, elementos clave para convencer a otros de que el resultado es válido.',
    devolutionFeedback: 'Esta consigna exige construir una prueba o justificación lógica frente al grupo de pares. Si la ubicas de forma anticipada, pides demostraciones antes de que los estudiantes hayan podido experimentar o formular un código común. El docente debe delegar aquí la carga de la prueba en los alumnos.',
  },
  {
    id: 'c11',
    type: 'Material',
    content: 'Pizarra para mostrar cálculos y verificar resultados',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'La validación requiere espacios públicos donde exponer y verificar. La pizarra permite la confrontación colectiva de las diferentes soluciones propuestas.',
    devolutionFeedback: 'Este recurso debe servir como un tablero de contrastación pública para el debate científico escolar. Exponerlo de forma muy temprana induce a que los estudiantes copien un resultado correcto en lugar de experimentar el problema individualmente con el material concreto.',
  },
  {
    id: 'c7',
    type: 'Rol Docente',
    content: 'Moderar el debate. Preguntar "¿Cómo sabes que eso es correcto?"',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'En validación, el docente garantiza las reglas del debate científico. Sus preguntas orientan hacia la argumentación y la prueba, sin validar él mismo las soluciones.',
    devolutionFeedback: 'En esta etapa del debate, el docente modera y arbitra sin emitir juicios de valor directos para evitar que los alumnos busquen su aprobación en lugar de la verdad lógica. Plantear esta pregunta antes de tiempo interrumpe la exploración intuitiva, y dejarla para el cierre pospone innecesariamente la formalización.',
  },
  {
    id: 'c15',
    type: 'Pregunta Guía',
    content: '¿Estás seguro? ¿Cómo lo compruebas? ¿Alguien tiene otra forma?',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'Las preguntas de validación exigen justificación y confrontación. Introducen la duda y la necesidad de prueba, elementos esenciales del debate matemático.',
    devolutionFeedback: 'Esta pregunta busca sacudir certezas ingenuas e incentivar la búsqueda de contraejemplos. Si se plantea al principio, genera inseguridad y bloquea el tanteo libre; si se deja para el final, no aporta a la formalización conceptual.',
  },

  // INSTITUTIONALIZATION
  {
    id: 'c4',
    type: 'Consigna',
    content: '"Observen cómo lo que descubrieron se relaciona con las operaciones de suma y multiplicación."',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'En institucionalización, el docente conecta el conocimiento construido con el saber oficial. Esta consigna formaliza lo aprendido vinculándolo con conceptos matemáticos establecidos.',
    devolutionFeedback: 'Esta indicación asocia el trabajo práctico realizado por el estudiante con el saber disciplinar oficial. Presentarla de forma prematura produce el "Efecto Topacio", donde el docente revela la solución matemática de antemano, anulando el esfuerzo de indagación del estudiante.',
  },
  {
    id: 'c16',
    type: 'Material',
    content: 'Cuaderno de matemáticas para registrar conceptos formales',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'En institucionalización se registra el saber oficial. El cuaderno es donde se consignan las definiciones, fórmulas y procedimientos validados por la comunidad matemática.',
    devolutionFeedback: 'Este cuaderno es el soporte donde se consagra el saber despersonalizado y oficial. Introducirlo de manera anticipada desvirtúa la exploración libre y presiona al estudiante a adivinar lo que el docente espera que escriba en lugar de interactuar genuinamente con el problema.',
  },
  {
    id: 'c8',
    type: 'Rol Docente',
    content: 'Formalizar, conectar con vocabulario matemático y generalizar los hallazgos.',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'En institucionalización, el docente asume su rol de representante del saber institucional. Es el momento de nombrar, clasificar y situar el conocimiento en el sistema disciplinar.',
    devolutionFeedback: 'Este rol es de síntesis y formalización oficial del saber. Si el docente introduce terminología formal o devela la teoría antes de tiempo, destruye el carácter adidáctico del problema, llevando a los alumnos a imitar vocablos técnicos en lugar de construir sentido.',
  },
  {
    id: 'c12',
    type: 'Pregunta Guía',
    content: '¿Qué nombre matemático tiene lo que hicimos? ¿Dónde más se aplica?',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'Estas preguntas de institucionalización conectan con el saber oficial. Buscan la generalización y el reconocimiento del conocimiento como parte de la matemática escolar.',
    devolutionFeedback: 'Esta pregunta conecta el saber construido de manera intuitiva con los conceptos de la enciclopedia cultural. Plantearla antes de tiempo resulta desconcertante, pues los estudiantes aún están interactuando con la dinámica concreta del problema.',
  },
];

/**
 * FORMA B — «El Jardín de las Plantas». Medición y comparación de longitudes con unidades no
 * convencionales (BCEP, núcleo Pensamiento Matemático: cuantificación y medición). Misma
 * arquitectura que la Forma A: 16 tarjetas, 4 por fase, 1 de cada tipo por fase.
 */
const FORMA_B_CARDS: Card[] = [
  // ACTION
  {
    id: 'b1',
    type: 'Consigna',
    content: '"Tienes cintas de papel de distintos largos. Intenta ordenar las plantas del jardín de la más baja a la más alta usando las cintas para comparar."',
    correctPhase: TSDPhase.ACTION,
    justification: 'La consigna de la fase de acción debe ser abierta y permitir la exploración libre. El estudiante interactúa directamente con el medio (cintas y plantas) sin instrucciones detalladas sobre cómo medir.',
    devolutionFeedback: 'Esta es una consigna abierta para la exploración inicial de la comparación de longitudes. Si se coloca de forma tardía, se interrumpe el libre tanteo del "milieu". No permitir que el niño o la niña explore por sí mismo desde el inicio impide que asuma la responsabilidad de medir y experimente el fracaso o reajuste de manera autónoma.',
  },
  {
    id: 'b2',
    type: 'Material',
    content: 'Cintas de papel de distintos largos y tarjetas con dibujos de plantas de diferente altura',
    correctPhase: TSDPhase.ACTION,
    justification: 'Los materiales de acción deben permitir la manipulación directa y el ensayo-error. Las cintas y las plantas conforman el "milieu" donde el estudiante aprende por retroalimentación del medio al comparar longitudes.',
    devolutionFeedback: 'Este recurso material conforma el "milieu" sobre el que el estudiante actúa directamente. Ubicarlo de forma tardía confunde la manipulación empírica inicial de la medición con la argumentación teórica o la formalización abstracta. El niño o la niña debe interactuar libremente con estos objetos en la etapa de partida para generar sus propias estrategias de comparación.',
  },
  {
    id: 'b3',
    type: 'Rol Docente',
    content: 'Observar sin intervenir. Dejar que los niños y niñas midan y comparen libremente.',
    correctPhase: TSDPhase.ACTION,
    justification: 'En acción, la educadora debe mantenerse al margen para preservar la situación adidáctica. La retroalimentación debe venir del medio (si la cinta alcanza o no), no de la corrección de la docente.',
    devolutionFeedback: 'En esta etapa, la educadora debe mantenerse al margen para preservar la naturaleza adidáctica del problema de medición. Colocar este rol de abstención en otros momentos dejaría a los niños y niñas sin la mediación o moderación necesarias para confrontar ideas, o bien impediría la indispensable formalización final.',
  },
  {
    id: 'b4',
    type: 'Pregunta Guía',
    content: '¿Qué pasa si usas esta cinta? ¿Te alcanza para cubrir toda la planta?',
    correctPhase: TSDPhase.ACTION,
    justification: 'Estas preguntas de acción dirigen la atención hacia el medio sin dar la respuesta. El niño o la niña debe verificar por sí mismo mediante la manipulación de las cintas sobre las plantas.',
    devolutionFeedback: 'Este tipo de pregunta impulsa al estudiante a confrontar el milieu material y verificar de forma autónoma si la cinta corresponde al largo de la planta. Ubicarla fuera de su lugar desvía el foco de la argumentación colectiva o la creación de códigos compartidos de medición, regresando a una simple comprobación empírica.',
  },

  // FORMULATION
  {
    id: 'b5',
    type: 'Consigna',
    content: '"Explica a tu compañero cómo decidiste qué planta es más alta y cuál es más baja."',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'En formulación, el estudiante debe explicitar su estrategia de comparación para comunicarla a otros. Esta consigna obliga a verbalizar el proceso de medición desarrollado en la fase anterior.',
    devolutionFeedback: 'Esta consigna exige la verbalización y creación de un lenguaje común para transmitir una estrategia de medición. Si la adelantas demasiado, exiges una explicitación prematura cuando aún no se ha consolidado la práctica de comparar con las cintas. Si la retrasas, pierdes el momento de debate entre pares antes de la intervención formal.',
  },
  {
    id: 'b6',
    type: 'Material',
    content: 'Hojas de registro para dibujar el orden de las plantas y las cintas que usaste',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'En formulación se necesitan materiales para registrar y comunicar. Las hojas de registro permiten externalizar el pensamiento sobre el orden de las plantas y compartirlo con otros estudiantes.',
    devolutionFeedback: 'Este medio gráfico permite externalizar y registrar el pensamiento para poder comunicarlo. Exigir este registro demasiado pronto interrumpe la fluidez de la experimentación libre con las cintas y genera sobrecarga cognitiva, mientras que usarlo al final resulta tardío para la formalización oficial.',
  },
  {
    id: 'b7',
    type: 'Rol Docente',
    content: 'Facilitar la comunicación entre los niños y niñas. Pedir clarificaciones sin dar respuestas.',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'En formulación, la educadora es mediadora de la comunicación. Su rol es ayudar a hacer explícito lo implícito sobre el orden de las plantas, sin imponer sus propias formulaciones.',
    devolutionFeedback: 'En este momento del proceso, la educadora actúa como facilitadora que ayuda a hacer explícitos los saberes que aún están implícitos sobre la comparación de longitudes. Si asumes este rol de forma anticipada, saboteas la exploración autónoma; si lo dejas para el final, evades la responsabilidad de estructurar formalmente el saber construido.',
  },
  {
    id: 'b8',
    type: 'Pregunta Guía',
    content: '¿Cómo podrías explicar tu forma de medir para que otro la entienda?',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'Esta pregunta de formulación obliga a explicitar el procedimiento de medición. El estudiante debe reflexionar sobre su propio proceso de comparar largos para poder comunicarlo.',
    devolutionFeedback: 'Esta interrogante empuja al estudiante a construir un código o representación de su forma de medir. Si se realiza antes de tiempo, se fuerza una sistematización abstracta sin base empírica; si se posterga, resulta insuficiente porque se requiere comprobar lógicamente la validez del orden propuesto.',
  },

  // VALIDATION
  {
    id: 'b9',
    type: 'Consigna',
    content: '"Demuestra al curso que tu orden de las plantas es correcto, usando las cintas como referencia."',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'La validación requiere demostrar la corrección de la solución. Esta consigna pide evidencia y argumentación, elementos clave para convencer a otros de que el orden de las plantas es válido.',
    devolutionFeedback: 'Esta consigna exige construir una prueba o justificación lógica frente al grupo de pares, usando las cintas como instrumento de verificación. Si la ubicas de forma anticipada, pides demostraciones antes de que los niños y niñas hayan podido experimentar o formular un código común de medición. La educadora debe delegar aquí la carga de la prueba en los estudiantes.',
  },
  {
    id: 'b10',
    type: 'Material',
    content: 'Pizarra para pegar las cintas en orden y verificar las comparaciones de largo',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'La validación requiere espacios públicos donde exponer y verificar. La pizarra permite la confrontación colectiva de las diferentes propuestas de orden entre las plantas.',
    devolutionFeedback: 'Este recurso debe servir como un tablero de contrastación pública para el debate científico escolar sobre la medición. Exponerlo de forma muy temprana induce a que los estudiantes copien un orden correcto en lugar de experimentar el problema individualmente con las cintas.',
  },
  {
    id: 'b11',
    type: 'Rol Docente',
    content: 'Moderar el debate. Preguntar "¿Cómo sabes que esa planta es más alta que la otra?"',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'En validación, la educadora garantiza las reglas del debate científico. Sus preguntas orientan hacia la argumentación y la prueba de la comparación, sin validar ella misma el orden.',
    devolutionFeedback: 'En esta etapa del debate, la educadora modera y arbitra sin emitir juicios de valor directos para evitar que los niños y niñas busquen su aprobación en lugar de la verdad lógica de la medición. Plantear esta pregunta antes de tiempo interrumpe la exploración intuitiva, y dejarla para el cierre pospone innecesariamente la formalización.',
  },
  {
    id: 'b12',
    type: 'Pregunta Guía',
    content: '¿Estás seguro? ¿Cómo lo compruebas? ¿Alguien midió de otra forma?',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'Las preguntas de validación exigen justificación y confrontación. Introducen la duda y la necesidad de prueba, elementos esenciales del debate matemático sobre la medición.',
    devolutionFeedback: 'Esta pregunta busca sacudir certezas ingenuas e incentivar la búsqueda de formas alternativas de medir. Si se plantea al principio, genera inseguridad y bloquea el tanteo libre; si se deja para el final, no aporta a la formalización conceptual.',
  },

  // INSTITUTIONALIZATION
  {
    id: 'b13',
    type: 'Consigna',
    content: '"Observen cómo lo que descubrieron se relaciona con comparar y ordenar objetos por su longitud."',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'En institucionalización, la educadora conecta el conocimiento construido con el saber oficial. Esta consigna formaliza lo aprendido vinculándolo con el concepto matemático de longitud.',
    devolutionFeedback: 'Esta indicación asocia el trabajo práctico realizado por el estudiante con el saber disciplinar oficial sobre la medición. Presentarla de forma prematura produce el "Efecto Topacio", donde la docente revela la solución matemática de antemano, anulando el esfuerzo de indagación del estudiante.',
  },
  {
    id: 'b14',
    type: 'Material',
    content: 'Cuaderno de registro para anotar los conceptos de "más largo", "más corto" e "igual de largo"',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'En institucionalización se registra el saber oficial. El cuaderno es donde se consignan las definiciones y el vocabulario de medición validados por la comunidad matemática.',
    devolutionFeedback: 'Este cuaderno es el soporte donde se consagra el saber despersonalizado y oficial sobre la longitud. Introducirlo de manera anticipada desvirtúa la exploración libre y presiona al estudiante a adivinar lo que la docente espera que escriba en lugar de interactuar genuinamente con el problema.',
  },
  {
    id: 'b15',
    type: 'Rol Docente',
    content: 'Formalizar, conectar con el vocabulario de medición de longitud y generalizar los hallazgos.',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'En institucionalización, la educadora asume su rol de representante del saber institucional. Es el momento de nombrar, clasificar y situar el conocimiento de medición en el sistema disciplinar.',
    devolutionFeedback: 'Este rol es de síntesis y formalización oficial del saber de medición. Si la educadora introduce terminología formal o devela la teoría antes de tiempo, destruye el carácter adidáctico del problema, llevando a los niños y niñas a imitar vocablos técnicos en lugar de construir sentido.',
  },
  {
    id: 'b16',
    type: 'Pregunta Guía',
    content: '¿Qué nombre tiene lo que hicimos al comparar los largos? ¿Dónde más usamos esto?',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'Estas preguntas de institucionalización conectan con el saber oficial. Buscan la generalización y el reconocimiento del concepto de longitud como parte de la matemática escolar.',
    devolutionFeedback: 'Esta pregunta conecta el saber construido de manera intuitiva con los conceptos de la enciclopedia cultural sobre medir. Plantearla antes de tiempo resulta desconcertante, pues los estudiantes aún están interactuando con la dinámica concreta del problema.',
  },
];

/**
 * FORMA C — «El Taller de los Collares». Patrones y seriación con material concreto (BCEP,
 * núcleo Pensamiento Matemático: reconocimiento y reproducción de patrones, seriación por
 * atributos). Misma arquitectura que la Forma A: 16 tarjetas, 4 por fase, 1 de cada tipo por fase.
 */
const FORMA_C_CARDS: Card[] = [
  // ACTION
  {
    id: 'p1',
    type: 'Consigna',
    content: '"Tienes cuentas de distintos colores y tamaños. Intenta armar un collar que siga un patrón que tú elijas."',
    correctPhase: TSDPhase.ACTION,
    justification: 'La consigna de la fase de acción debe ser abierta y permitir la exploración libre. El estudiante interactúa directamente con el medio (cuentas y cordón) sin instrucciones detalladas sobre qué patrón seguir.',
    devolutionFeedback: 'Esta es una consigna abierta para la exploración inicial del patrón. Si se coloca de forma tardía, se interrumpe el libre tanteo del "milieu". No permitir que el niño o la niña explore por sí mismo desde el inicio impide que asuma la responsabilidad de crear su secuencia y experimente el fracaso o reajuste de manera autónoma.',
  },
  {
    id: 'p2',
    type: 'Material',
    content: 'Cuentas de colores y tamaños variados, e hilo o cordón para ensartar',
    correctPhase: TSDPhase.ACTION,
    justification: 'Los materiales de acción deben permitir la manipulación directa y el ensayo-error. Las cuentas y el cordón conforman el "milieu" donde el estudiante aprende por retroalimentación del medio al construir un patrón.',
    devolutionFeedback: 'Este recurso material conforma el "milieu" sobre el que el estudiante actúa directamente. Ubicarlo de forma tardía confunde la manipulación empírica inicial del patrón con la argumentación teórica o la formalización abstracta. El niño o la niña debe interactuar libremente con estos objetos en la etapa de partida para generar su propia secuencia.',
  },
  {
    id: 'p3',
    type: 'Rol Docente',
    content: 'Observar sin intervenir. Dejar que los niños y niñas experimenten libremente con los patrones.',
    correctPhase: TSDPhase.ACTION,
    justification: 'En acción, la educadora debe mantenerse al margen para preservar la situación adidáctica. La retroalimentación debe venir del medio (si el patrón se repite o se rompe), no de la corrección de la docente.',
    devolutionFeedback: 'En esta etapa, la educadora debe mantenerse al margen para preservar la naturaleza adidáctica del problema de patrones. Colocar este rol de abstención en otros momentos dejaría a los niños y niñas sin la mediación o moderación necesarias para confrontar ideas, o bien impediría la indispensable formalización final.',
  },
  {
    id: 'p4',
    type: 'Pregunta Guía',
    content: '¿Qué pasa si pones esta cuenta aquí? ¿Sigue el mismo orden que empezaste?',
    correctPhase: TSDPhase.ACTION,
    justification: 'Estas preguntas de acción dirigen la atención hacia el medio sin dar la respuesta. El niño o la niña debe verificar por sí mismo mediante la manipulación de las cuentas si el patrón se mantiene.',
    devolutionFeedback: 'Este tipo de pregunta impulsa al estudiante a confrontar el milieu material y verificar de forma autónoma la regularidad de su secuencia. Ubicarla fuera de su lugar desvía el foco de la argumentación colectiva o la creación de códigos compartidos de patrón, regresando a una simple comprobación empírica.',
  },

  // FORMULATION
  {
    id: 'p5',
    type: 'Consigna',
    content: '"Explica a tu compañero qué patrón elegiste para tu collar y por qué pusiste las cuentas en ese orden."',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'En formulación, el estudiante debe explicitar su estrategia de secuenciación para comunicarla a otros. Esta consigna obliga a verbalizar el proceso mental desarrollado en la fase anterior.',
    devolutionFeedback: 'Esta consigna exige la verbalización y creación de un lenguaje común para transmitir un patrón. Si la adelantas demasiado, exiges una explicitación prematura cuando aún no se ha consolidado la práctica de ensartar. Si la retrasas, pierdes el momento de debate entre pares antes de la intervención formal.',
  },
  {
    id: 'p6',
    type: 'Material',
    content: 'Hojas de registro para dibujar la secuencia de colores y tamaños del collar',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'En formulación se necesitan materiales para registrar y comunicar. Las hojas de registro permiten externalizar el pensamiento sobre el patrón y compartirlo con otros estudiantes.',
    devolutionFeedback: 'Este medio gráfico permite externalizar y registrar el pensamiento para poder comunicarlo. Exigir este registro demasiado pronto interrumpe la fluidez de la experimentación libre con las cuentas y genera sobrecarga cognitiva, mientras que usarlo al final resulta tardío para la formalización oficial.',
  },
  {
    id: 'p7',
    type: 'Rol Docente',
    content: 'Facilitar la comunicación entre los niños y niñas. Pedir clarificaciones sin dar respuestas.',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'En formulación, la educadora es mediadora de la comunicación. Su rol es ayudar a hacer explícito lo implícito sobre el patrón elegido, sin imponer sus propias formulaciones.',
    devolutionFeedback: 'En este momento del proceso, la educadora actúa como facilitadora que ayuda a hacer explícitos los saberes que aún están implícitos sobre la secuencia. Si asumes este rol de forma anticipada, saboteas la exploración autónoma; si lo dejas para el final, evades la responsabilidad de estructurar formalmente el saber construido.',
  },
  {
    id: 'p8',
    type: 'Pregunta Guía',
    content: '¿Cómo podrías explicar tu patrón para que otro lo repita?',
    correctPhase: TSDPhase.FORMULATION,
    justification: 'Esta pregunta de formulación obliga a explicitar el procedimiento del patrón. El estudiante debe reflexionar sobre su propio proceso para poder comunicarlo.',
    devolutionFeedback: 'Esta interrogante empuja al estudiante a construir un código o representación de su secuencia. Si se realiza antes de tiempo, se fuerza una sistematización abstracta sin base empírica; si se posterga, resulta insuficiente porque se requiere comprobar lógicamente la validez del patrón.',
  },

  // VALIDATION
  {
    id: 'p9',
    type: 'Consigna',
    content: '"Demuestra al curso que tu collar sigue el patrón que dijiste, mostrando la secuencia completa."',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'La validación requiere demostrar la corrección de la solución. Esta consigna pide evidencia y argumentación, elementos clave para convencer a otros de que el patrón es válido.',
    devolutionFeedback: 'Esta consigna exige construir una prueba o justificación lógica frente al grupo de pares. Si la ubicas de forma anticipada, pides demostraciones antes de que los niños y niñas hayan podido experimentar o formular un código común. La educadora debe delegar aquí la carga de la prueba en los estudiantes.',
  },
  {
    id: 'p10',
    type: 'Material',
    content: 'Pizarra para dibujar o pegar la secuencia de colores y verificar el patrón',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'La validación requiere espacios públicos donde exponer y verificar. La pizarra permite la confrontación colectiva de los diferentes patrones propuestos.',
    devolutionFeedback: 'Este recurso debe servir como un tablero de contrastación pública para el debate científico escolar sobre los patrones. Exponerlo de forma muy temprana induce a que los estudiantes copien una secuencia correcta en lugar de experimentar el problema individualmente con el material concreto.',
  },
  {
    id: 'p11',
    type: 'Rol Docente',
    content: 'Moderar el debate. Preguntar "¿Cómo sabes que esa es la cuenta que sigue?"',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'En validación, la educadora garantiza las reglas del debate científico. Sus preguntas orientan hacia la argumentación y la prueba del patrón, sin validar ella misma la secuencia.',
    devolutionFeedback: 'En esta etapa del debate, la educadora modera y arbitra sin emitir juicios de valor directos para evitar que los niños y niñas busquen su aprobación en lugar de la verdad lógica del patrón. Plantear esta pregunta antes de tiempo interrumpe la exploración intuitiva, y dejarla para el cierre pospone innecesariamente la formalización.',
  },
  {
    id: 'p12',
    type: 'Pregunta Guía',
    content: '¿Estás seguro? ¿Cómo lo compruebas? ¿Alguien armó otro patrón posible?',
    correctPhase: TSDPhase.VALIDATION,
    justification: 'Las preguntas de validación exigen justificación y confrontación. Introducen la duda y la necesidad de prueba, elementos esenciales del debate matemático sobre los patrones.',
    devolutionFeedback: 'Esta pregunta busca sacudir certezas ingenuas e incentivar la búsqueda de secuencias alternativas. Si se plantea al principio, genera inseguridad y bloquea el tanteo libre; si se deja para el final, no aporta a la formalización conceptual.',
  },

  // INSTITUTIONALIZATION
  {
    id: 'p13',
    type: 'Consigna',
    content: '"Observen cómo lo que descubrieron se relaciona con reconocer y crear patrones y series."',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'En institucionalización, la educadora conecta el conocimiento construido con el saber oficial. Esta consigna formaliza lo aprendido vinculándolo con el concepto matemático de patrón.',
    devolutionFeedback: 'Esta indicación asocia el trabajo práctico realizado por el estudiante con el saber disciplinar oficial sobre los patrones. Presentarla de forma prematura produce el "Efecto Topacio", donde la docente revela la solución matemática de antemano, anulando el esfuerzo de indagación del estudiante.',
  },
  {
    id: 'p14',
    type: 'Material',
    content: 'Cuaderno de registro para anotar los conceptos de "patrón", "secuencia" y "orden de tamaño"',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'En institucionalización se registra el saber oficial. El cuaderno es donde se consignan las definiciones y el vocabulario de patrones y seriación validados por la comunidad matemática.',
    devolutionFeedback: 'Este cuaderno es el soporte donde se consagra el saber despersonalizado y oficial sobre los patrones. Introducirlo de manera anticipada desvirtúa la exploración libre y presiona al estudiante a adivinar lo que la docente espera que escriba en lugar de interactuar genuinamente con el problema.',
  },
  {
    id: 'p15',
    type: 'Rol Docente',
    content: 'Formalizar, conectar con el vocabulario de patrones y seriación, y generalizar los hallazgos.',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'En institucionalización, la educadora asume su rol de representante del saber institucional. Es el momento de nombrar, clasificar y situar el conocimiento de patrones en el sistema disciplinar.',
    devolutionFeedback: 'Este rol es de síntesis y formalización oficial del saber de patrones. Si la educadora introduce terminología formal o devela la teoría antes de tiempo, destruye el carácter adidáctico del problema, llevando a los niños y niñas a imitar vocablos técnicos en lugar de construir sentido.',
  },
  {
    id: 'p16',
    type: 'Pregunta Guía',
    content: '¿Qué nombre matemático tiene lo que hicimos al repetir el orden? ¿Dónde más vemos patrones?',
    correctPhase: TSDPhase.INSTITUTIONALIZATION,
    justification: 'Estas preguntas de institucionalización conectan con el saber oficial. Buscan la generalización y el reconocimiento del concepto de patrón como parte de la matemática escolar.',
    devolutionFeedback: 'Esta pregunta conecta el saber construido de manera intuitiva con los conceptos de la enciclopedia cultural sobre los patrones. Plantearla antes de tiempo resulta desconcertante, pues los estudiantes aún están interactuando con la dinámica concreta del problema.',
  },
];

/** Un elemento del contexto didáctico mostrado en el panel principal: [nombre, dato, emoji]. */
export type FormaElemento = [string, number, string];

export interface Forma {
  id: 'A' | 'B' | 'C';
  nombre: string;
  contentLevel: number;
  contentId: string;
  cards: Card[];
  /** Párrafo de contexto mostrado bajo el título del desafío en la pantalla del simulador. */
  descripcion: string;
  /** Elementos del contexto (p. ej. productos, plantas, cuentas) mostrados como chips. */
  elementos: FormaElemento[];
}

export const FORMAS: Forma[] = [
  {
    id: 'A',
    nombre: 'El Almacén de Monedas',
    contentLevel: 1,
    contentId: 'almacen-monedas',
    cards: FORMA_A_CARDS,
    descripcion: 'Los estudiantes tienen 20 monedas (fichas) y deben decidir qué productos comprar en un almacén ficticio para gastar exactamente lo que tienen. Tu tarea es ubicar cada tarjeta de intervención en la fase de la TSD que le corresponde.',
    elementos: [['Manzana', 3, '🍎'], ['Leche', 5, '🥛'], ['Pan', 7, '🍞'], ['Queso', 4, '🧀'], ['Naranja', 6, '🍊'], ['Huevo', 2, '🥚'], ['Plátano', 1, '🍌'], ['Jamón', 8, '🍖']],
  },
  {
    id: 'B',
    nombre: 'El Jardín de las Plantas',
    contentLevel: 2,
    contentId: 'jardin-plantas',
    cards: FORMA_B_CARDS,
    descripcion: 'Los niños y niñas deben comparar la altura de las plantas del jardín usando cintas de papel como unidad de medida no convencional, para ordenarlas de la más baja a la más alta. Tu tarea es ubicar cada tarjeta de intervención en la fase de la TSD que le corresponde.',
    elementos: [['Cactus', 12, '🌵'], ['Tulipán', 18, '🌷'], ['Helecho', 22, '🌿'], ['Girasol', 45, '🌻'], ['Árbol joven', 60, '🌳'], ['Trébol', 8, '🍀']],
  },
  {
    id: 'C',
    nombre: 'El Taller de los Collares',
    contentLevel: 3,
    contentId: 'taller-collares',
    cards: FORMA_C_CARDS,
    descripcion: 'Los niños y niñas deben crear y continuar patrones con cuentas de colores y tamaños para armar collares, y ordenar un grupo de fichas de la más grande a la más pequeña. Tu tarea es ubicar cada tarjeta de intervención en la fase de la TSD que le corresponde.',
    elementos: [['Cuenta roja', 1, '🔴'], ['Cuenta azul', 1, '🔵'], ['Cuenta amarilla', 1, '🟡'], ['Cuenta verde', 1, '🟢'], ['Cuenta grande', 1, '⚫'], ['Cuenta pequeña', 1, '⚪']],
  },
];

export const DEFAULT_FORMA_ID: Forma['id'] = 'A';

/** Devuelve la Forma por id; si no se reconoce, usa la Forma A por defecto (ver DEFAULT_FORMA_ID). */
export const getForma = (id: string | null | undefined): Forma => FORMAS.find((f) => f.id === id) ?? FORMAS[0];

/** Compat: Forma A, para código que aún no distingue formas. Preferir getForma(formaId).cards. */
export const INITIAL_CARDS: Card[] = FORMAS[0].cards;
