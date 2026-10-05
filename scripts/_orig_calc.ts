// GENERADO: copia literal de la lógica del App.tsx ORIGINAL del Simulador TSD (no editar)
import { INITIAL_CARDS, type Card } from '../src/data/cards';
export function originalCalc(history: any[], items: any) {
  const useMemo = (fn: () => any, _d?: any) => fn();
  const stats = useMemo(() => {
    const moves = history.filter(h => h.type === 'move');
    const analyses = history.filter(h => h.type === 'analysis');
    
    // Get current board state for comparing with historical data
    const currentCorrectCount = Object.entries(items).reduce((acc, [phase, cards]) => {
      if (phase === 'available') return acc;
      return acc + (cards as Card[]).filter(c => c.correctPhase === phase).length;
    }, 0);

    const currentErrorCount = Object.entries(items).reduce((acc, [phase, cards]) => {
      if (phase === 'available') return acc;
      return acc + (cards as Card[]).filter(c => c.correctPhase !== phase).length;
    }, 0);

    const availableCards = items.available as Card[];
    const totalAssigned = INITIAL_CARDS.length - availableCards.length;
    const hasEvidence = moves.length > 0 || analyses.length > 0;

    // Appropriation TSD calculation:
    // 1. Accuracy (Current state vs Total cards): 50%
    // 2. Efficiency (Current hits vs Total moves made): 25%
    // 3. Reflection (Analyses made vs Total cards): 25%
    const accuracy = INITIAL_CARDS.length > 0 ? Math.min(100, (currentCorrectCount / INITIAL_CARDS.length) * 100) : 0;
    const efficiency = moves.length > 0 ? Math.min(100, (currentCorrectCount / moves.length) * 100) : 0;
    const reflectionFactor = Math.min(100, (analyses.length / INITIAL_CARDS.length) * 100);
    
    const appropriation = hasEvidence 
      ? Math.round((accuracy * 0.5) + (efficiency * 0.25) + (reflectionFactor * 0.25))
      : null;

    return {
      totalMoves: moves.length,
      currentHits: currentCorrectCount,
      currentErrors: currentErrorCount,
      analyses: analyses.length,
      appropriation,
      accuracy: Math.round(accuracy),
      efficiency: Math.round(efficiency),
      reflectionFactor: Math.round(reflectionFactor),
      totalCards: INITIAL_CARDS.length,
      itemsAssigned: totalAssigned,
      hasEvidence
    };
  }, [history, items]);
  const metrics = useMemo(() => {
    const moves = history.filter(h => h.type === 'move');
    const analyses = history.filter(h => h.type === 'analysis');
    
    // 1. Sustained Cognitive Vigilance (ritmo de reflexión)
    let vigilantMoves = 0;
    let evaluatedMovesCount = 0;
    for (let i = 1; i < moves.length; i++) {
      const diff = moves[i].timestamp - moves[i - 1].timestamp;
      evaluatedMovesCount++;
      if (diff >= 5000 && diff <= 60000) {
        vigilantMoves++;
      }
    }
    const metric1_den = evaluatedMovesCount;
    const metric1_has = metric1_den > 0;
    const metric1_val = metric1_has ? Math.round((vigilantMoves / metric1_den) * 100) : null;

    // 2. Error Self-Correction Index
    const cardsWithErrorState = new Set<string>();
    let totalErrorMetricsScore = 0;
    const cardHistoryMap: { [cardId: string]: boolean[] } = {};
    moves.forEach(m => {
      if (!cardHistoryMap[m.cardId]) {
        cardHistoryMap[m.cardId] = [];
      }
      cardHistoryMap[m.cardId].push(m.isCorrect);
    });

    Object.entries(cardHistoryMap).forEach(([cardId, states]) => {
      const firstErrorIndex = states.indexOf(false);
      if (firstErrorIndex !== -1) {
        cardsWithErrorState.add(cardId);
        
        // 1. Error Detection (Did they view the devolution didáctica/analysis of this card?)
        const hasDetectedError = analyses.some(a => a.cardId === cardId);
        
        // 2. Autocorrection (Did they place the card in its correct phase after the first error?)
        const hasAutocorrected = states.slice(firstErrorIndex).includes(true);
        
        let cardScore = 0;
        if (hasDetectedError) cardScore += 50;
        if (hasAutocorrected) cardScore += 50;
        
        totalErrorMetricsScore += cardScore;
      }
    });
    const metric2_den = cardsWithErrorState.size;
    const metric2_has = metric2_den > 0;
    const metric2_val = metric2_has ? Math.round(totalErrorMetricsScore / metric2_den) : null;

    // 3. Adidactic Phase Alignment (evitar institucionalización prematura)
    let prematureInstitutionalMoves = 0;
    moves.forEach((m, idx) => {
      if (m.to === 'institutionalization') {
        const movesBeforeThis = moves.slice(0, idx);
        const uniqueCardsMovedToActionOrFormulation = new Set(
          movesBeforeThis.filter(prevMove => prevMove.to === 'action' || prevMove.to === 'formulation').map(prevMove => prevMove.cardId)
        );
        if (uniqueCardsMovedToActionOrFormulation.size < 6) {
          prematureInstitutionalMoves++;
        }
      }
    });
    const metric3_den = moves.length;
    const metric3_has = metric3_den > 0;
    const metric3_val = metric3_has ? Math.max(0, 100 - (prematureInstitutionalMoves * 20)) : null;

    // 4. Fluency and Cognitive Load Control (redundancias)
    let redundantMoves = 0;
    Object.values(cardHistoryMap).forEach(states => {
      if (states.length > 2) {
        redundantMoves += (states.length - 2);
      }
    });
    const metric4_den = moves.length;
    const metric4_has = metric4_den > 0;
    const metric4_val = metric4_has ? Math.max(0, 100 - (redundantMoves * 10)) : null;

    // 5. Feedback Utilization (clicks de devolución detallados)
    const totalAssigned = INITIAL_CARDS.length - (items.available?.length || 0);
    const analyzedIds = new Set(analyses.map(a => a.cardId));
    const metric5_den = totalAssigned;
    const metric5_has = metric5_den > 0;
    const metric5_val = metric5_has ? Math.min(100, Math.round((analyzedIds.size / metric5_den) * 100)) : null;

    // 6. Systematic Trial & Error (precision general de movimientos)
    const metric6_den = moves.length;
    const metric6_has = metric6_den > 0;
    const metric6_val = metric6_has ? Math.round((moves.filter(m => m.isCorrect).length / metric6_den) * 100) : null;

    // 7. Reflective Pause Ratio (análisis / movimientos)
    const metric7_den = moves.length;
    const metric7_has = metric7_den > 0;
    const metric7_val = metric7_has ? Math.min(100, Math.round((analyses.length / metric7_den) * 100)) : null;

    // 8. Initial Predictive Precision (planificación, éxito al primer intento)
    let firstMoveCorrectCount = 0;
    let cardsMovedCount = 0;
    Object.values(cardHistoryMap).forEach(states => {
      cardsMovedCount++;
      if (states[0] === true) {
        firstMoveCorrectCount++;
      }
    });
    const metric8_den = cardsMovedCount;
    const metric8_has = metric8_den > 0;
    const metric8_val = metric8_has ? Math.round((firstMoveCorrectCount / metric8_den) * 100) : null;

    // 9. Failure Resilience & Cognitive Readjustment
    let adaptiveSuccess = 0;
    let errorCount = 0;
    for (let i = 0; i < moves.length - 1; i++) {
      if (moves[i].isCorrect === false) {
        errorCount++;
        if (moves[i + 1].isCorrect === true) {
          adaptiveSuccess++;
        }
      }
    }
    const metric9_den = errorCount;
    const metric9_has = metric9_den > 0;
    const metric9_val = metric9_has ? Math.round((adaptiveSuccess / metric9_den) * 100) : null;

    // 10. Formulation Code Appropriation
    const formulationMoves = moves.filter(m => m.to === 'formulation');
    const correctFormulationMoves = formulationMoves.filter(m => m.isCorrect);
    const metric10_den = formulationMoves.length;
    const metric10_has = metric10_den > 0;
    const metric10_val = metric10_has ? Math.round((correctFormulationMoves.length / metric10_den) * 100) : null;

    return [
      {
        id: 'vigilancia',
        name: 'Vigilancia Cognitiva Sostenida',
        value: metric1_val,
        denominator: metric1_den,
        hasEvidence: metric1_has,
        basis: 'Zimmerman & Moylan (2009) — Fase de Ejecución: Auto-observación',
        description: 'Mide la autorregulación del tiempo entre acciones. Valores altos indican que el alumno no responde con impulsividad y se detiene a pensar antes de mover cada tarjeta.',
        feedback: metric1_val === null
          ? 'Sin evidencia suficiente para medir el ritmo reflexivo.'
          : metric1_val >= 80 
          ? 'Excelente vigilancia del ritmo cognitivo. No hay indicios de impulsividad o respuestas fortuitas.' 
          : metric1_val >= 50 
          ? 'Ritmo cognitivo en desarrollo. El estudiante muestra regularidad, aunque con momentos de respuesta acelerada sin planificación.' 
          : 'Nivel inicial. Alta tendencia a la respuesta inmediata o impulsiva (ensayo y error ciego) sin mediación de reflexión.'
      },
      {
        id: 'autocorreccion',
        name: 'Autocorrección y Detección de Errores',
        value: metric2_val,
        denominator: metric2_den,
        hasEvidence: metric2_has,
        basis: 'Zimmerman & Moylan (2009) — Fase de Ejecución: Autocontrol',
        description: 'Capacidad de identificar y reparar un error tras recibir la devolución del milieu sin deambular de forma aleatoria por otras fases.',
        feedback: metric2_val === null
          ? 'Sin evidencia de errores cometidos aún.'
          : metric2_val >= 80 
          ? 'Gran madurez en la asimilación del error. El estudiante lee la devolución didáctica y ajusta su esquema de inmediato.' 
          : metric2_val >= 50 
          ? 'Capacidad de enmienda en progreso. Se corrigen los errores, pero se requiere más de un intento errático antes de dar con la fase correcta.' 
          : 'Nivel inicial. Dificultad para interpretar las devoluciones del sistema, lo que genera confusión de descarte ante el obstáculo.'
      },
      {
        id: 'secuencia',
        name: 'Alineación con la Secuencia Adidáctica',
        value: metric3_val,
        denominator: metric3_den,
        hasEvidence: metric3_has,
        basis: 'Brousseau — Preservación de la situación adidáctica',
        description: 'Evaluación del orden didáctico. Penaliza la institucionalización prematura (revelar el saber antes de que el estudiante explore la acción y formulación).',
        feedback: metric3_val === null
          ? 'Sin evidencia de acciones de clasificación didáctica aún.'
          : metric3_val >= 80 
          ? 'Respeto absoluto por el tiempo didáctico del alumno. Las fases de exploración e intercambio preceden a la formalización.' 
          : metric3_val >= 50 
          ? 'Alineación didáctica aceptable, aunque se observan intentos tempranos de formalización cuando la exploración aún está inmadura.' 
          : 'Deslizamiento metadidáctico severo. Se intenta forzar la fase de institucionalización del saber sin haber consolidado la acción libre.'
      },
      {
        id: 'carga',
        name: 'Fluidez y Control de Carga Cognitiva',
        value: metric4_val,
        denominator: metric4_den,
        hasEvidence: metric4_has,
        basis: 'Zimmerman & Moylan (2009) — Fase de Ejecución: Auto-observación',
        description: 'Estabilidad de las decisiones. Mide la ausencia de movimientos redundantes (arrastrar la misma tarjeta de un lado a otro repetidamente).',
        feedback: metric4_val === null
          ? 'Sin evidencia de movimientos de tarjetas aún.'
          : metric4_val >= 80 
          ? 'Excelente economía cognitiva. El alumno realiza movimientos firmes y seguros, lo que denota una clara estructuración mental.' 
          : metric4_val >= 50 
          ? 'Duda o vacilación moderada. Algunas tarjetas sufren movimientos repetidos antes de encontrar su destino definitivo.' 
          : 'Sobrecarga cognitiva o tanteo errático severo. Arrastre repetitivo de las mismas tarjetas, reflejando desconexión didáctica.'
      },
      {
        id: 'feedback',
        name: 'Aprovechamiento de Retroalimentación',
        value: metric5_val,
        denominator: metric5_den,
        hasEvidence: metric5_has,
        basis: 'Zimmerman & Moylan (2009) — Fase de Ejecución: Autocontrol',
        description: 'Nivel de interacción y lectura de los análisis didácticos y las devoluciones detalladas proporcionadas por el milieu.',
        feedback: metric5_val === null
          ? 'Sin evidencia de asignación de tarjetas aún.'
          : metric5_val >= 80 
          ? 'Uso sobresaliente de la retroalimentación. El participante lee activamente las justificaciones para consolidar su aprendizaje.' 
          : metric5_val >= 50 
          ? 'Interacción parcial con el feedback. Se consultan las justificaciones ocasionalmente, perdiendo oportunidades de consolidación.' 
          : 'Lectura de devoluciones omitida. El estudiante ignora las explicaciones teóricas y se limita a resolver por descarte.'
      },
      {
        id: 'ensayo',
        name: 'Intencionalidad del Ensayo y Error',
        value: metric6_val,
        denominator: metric6_den,
        hasEvidence: metric6_has,
        basis: 'Brousseau — Interacción racional con el milieu',
        description: 'Eficiencia empírica. Compara los movimientos acertados sobre el total, evaluando si los intentos tienen lógica matemática.',
        feedback: metric6_val === null
          ? 'Sin evidencia de movimientos realizados aún.'
          : metric6_val >= 80 
          ? 'Alto índice de precisión racional. Casi todas las hipótesis y deducciones del alumno resultan ser correctas.' 
          : metric6_val >= 50 
          ? 'Ensayo y error moderado. Se formulan hipótesis válidas pero conviven con un porcentaje relevante de equivocaciones de tanteo.' 
          : 'Tanteo puramente aleatorio. Los movimientos no siguen una lógica didáctica estructurada y se basan en el azar.'
      },
      {
        id: 'reflexiva',
        name: 'Proporción de Detención Reflexiva',
        value: metric7_val,
        denominator: metric7_den,
        hasEvidence: metric7_has,
        basis: 'Brousseau — Devolución y análisis teórico',
        description: 'Proporción de consultas de análisis técnico respecto al número total de movimientos realizados.',
        feedback: metric7_val === null
          ? 'Sin evidencia de movimientos realizados aún.'
          : metric7_val >= 80 
          ? 'Comportamiento altamente reflexivo. El alumno equilibra de forma excelente la acción práctica con la teoría del aprendizaje.' 
          : metric7_val >= 50 
          ? 'Reflexión en progreso. Hay un balance aceptable, pero prevalece la tendencia a actuar sobre la tendencia a analizar.' 
          : 'Acción sobrepasando a la reflexión. El estudiante interactúa mecánicamente con el milieu sin detenerse a conceptualizar.'
      },
      {
        id: 'predictiva',
        name: 'Precisión Predictiva Planificada',
        value: metric8_val,
        denominator: metric8_den,
        hasEvidence: metric8_has,
        basis: 'Brousseau — Modelo mental pre-acción sobre el milieu',
        description: 'Tasa de éxito al primer intento. Refleja la solidez del análisis pre-tarea antes de someter las tarjetas al milieu.',
        feedback: metric8_val === null
          ? 'Sin evidencia de tarjetas movidas aún.'
          : metric8_val >= 80 
          ? 'Nivel maduro de planificación cognitiva. El estudiante posee un modelo conceptual muy robusto antes de actuar.' 
          : metric8_val >= 50 
          ? 'Planificación inicial aceptable. Se comprende la estructura a grandes rasgos, aunque persisten vacíos de lógica didáctica.' 
          : 'Deficiencia en la planificación previa. El alumno arrastra tarjetas sin un análisis conceptual anterior que sustente la acción.'
      },
      {
        id: 'resiliencia',
        name: 'Resiliencia al Fracaso y Reajuste Cognitivo',
        value: metric9_val,
        denominator: metric9_den,
        hasEvidence: metric9_has,
        basis: 'Panadero & Alonso-Tapia (2014) — Ciclo Adaptativo post-error',
        description: 'Capacidad de reaccionar de manera inmediata y asertiva después de cometer un error en una asignación anterior.',
        feedback: metric9_val === null
          ? 'Sin evidencia de errores cometidos aún.'
          : metric9_val >= 80 
          ? 'Resiliencia cognitiva sobresaliente. Un error es tomado inmediatamente como una oportunidad para reorganizar la lógica y acertar.' 
          : metric9_val >= 50 
          ? 'Capacidad adaptativa aceptable. El error desestabiliza levemente, pero el participante logra recuperarse tras unos instantes.' 
          : 'Frustración o persistencia en el error. Un fallo desencadena una serie de movimientos erróneos consecutivos o abandono reflexivo.'
      },
      {
        id: 'formulación',
        name: 'Apropiación de Códigos de Formulación',
        value: metric10_val,
        denominator: metric10_den,
        hasEvidence: metric10_has,
        basis: 'Brousseau — Fase de formulación y lenguaje',
        description: 'Desempeño específico en la fase de Formulación, encargada de la exteriorización y codificación de estrategias.',
        feedback: metric10_val === null
          ? 'Sin evidencia de movimientos en formulación aún.'
          : metric10_val >= 80 
          ? 'Perfecto dominio del lenguaje de formulación y su rol mediador. Se asimila plenamente la función de los códigos comunes.' 
          : metric10_val >= 50 
          ? 'Apropiación intermedia. Se comprende la necesidad de registrar y verbalizar, pero se confunde con la simple manipulación inicial.' 
          : 'Incomprensión de la fase de formulación. No se distingue el registro formal del juego autónomo o del debate de validación.'
      }
    ];
  }, [history, items]);

  const immzObj = useMemo(() => {
    const list = ['vigilancia', 'autocorreccion', 'feedback', 'reflexiva', 'resiliencia'];
    const relevant = metrics.filter(m => list.includes(m.id) && m.value !== null);
    const count = relevant.length;
    const value = count > 0 
      ? Math.round(relevant.reduce((acc, m) => acc + (m.value as number), 0) / count)
      : null;
    return { value, count, total: list.length };
  }, [metrics]);

  const ictsdObj = useMemo(() => {
    const list = ['secuencia', 'carga', 'ensayo', 'predictiva', 'formulación'];
    const relevant = metrics.filter(m => list.includes(m.id) && m.value !== null);
    const count = relevant.length;
    const value = count > 0 
      ? Math.round(relevant.reduce((acc, m) => acc + (m.value as number), 0) / count)
      : null;
    return { value, count, total: list.length };
  }, [metrics]);

  const immz = immzObj.value;
  const ictsd = ictsdObj.value;

  const immg = useMemo(() => {
    const relevant = metrics.filter(m => m.value !== null);
    if (relevant.length === 0) return null;
    return Math.round(relevant.reduce((acc, m) => acc + (m.value as number), 0) / relevant.length);
  }, [metrics]);


  const aoM = metrics.filter((m: any) => ['vigilancia', 'reflexiva'].includes(m.id) && m.value !== null);
  const immz_ao = aoM.length > 0 ? Math.round(aoM.reduce((a: number, m: any) => a + (m.value ?? 0), 0) / aoM.length) : null;
  const acM = metrics.filter((m: any) => ['autocorreccion', 'feedback', 'resiliencia'].includes(m.id) && m.value !== null);
  const immz_ac = acM.length > 0 ? Math.round(acM.reduce((a: number, m: any) => a + (m.value ?? 0), 0) / acM.length) : null;
  return { metrics, stats, immz: immzObj.value, idcd: ictsdObj.value, immg, immz_ao, immz_ac };
}
export function originalDevolution(items: any, analyzedIds: Set<string>) {
  const useMemo = (fn: () => any, _d?: any) => fn();
  const devolution = useMemo(() => {
    const totalPossible = INITIAL_CARDS.length;
    const clicks = analyzedIds.size;
    const availableCards = items.available as Card[];
    const assigned = INITIAL_CARDS.length - availableCards.length;
    
    if (assigned === 0) return 0;
    
    const correctCount = Object.entries(items).reduce((acc, [phase, cards]) => {
      if (phase === 'available') return acc;
      return acc + (cards as Card[]).filter(c => c.correctPhase === phase).length;
    }, 0);

    const baseScore = (correctCount / totalPossible) * 100;
    const explorationFactor = Math.min(100, (clicks / totalPossible) * 100);
    
    return Math.round((baseScore * 0.7) + (explorationFactor * 0.3));
  }, [items, analyzedIds]);


  return devolution;
}
