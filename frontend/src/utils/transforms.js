/**
 * Preenche para frente (forward-fill) os campos riskScore e riskLevel
 * na série histórica e nos vitais atuais.
 *
 * O backend calcula o score apenas periodicamente; entre os cálculos os campos
 * chegam nulos. Esta função garante que cada ponto da série carregue o último
 * valor válido visto até ele, e que currentVitals nunca exiba um score vazio
 * se há algum registro anterior com valor.
 */
export function fillForwardRiskFields(data) {
  if (!data) return data;

  const { historicalSeries, currentVitals } = data;
  if (!historicalSeries?.length) return data;

  const sorted = [...historicalSeries].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  );

  let lastRiskScore = null;
  let lastRiskLevel = null;

  const filled = sorted.map((point) => {
    const isOriginallyNull = point.riskScore == null;

    if (point.riskScore != null) lastRiskScore = point.riskScore;
    if (point.riskLevel != null) lastRiskLevel = point.riskLevel;

    return {
      ...point,
      riskScore:        point.riskScore ?? lastRiskScore,
      riskLevel:        point.riskLevel ?? lastRiskLevel,
      // true apenas nos pontos que NÃO tinham score original —
      // permite que o gráfico do score ignore esses pontos
      _riskScoreFilled: isOriginallyNull,
    };
  });

  const filledCurrentVitals = currentVitals
    ? {
        ...currentVitals,
        riskScore: currentVitals.riskScore ?? lastRiskScore,
        riskLevel: currentVitals.riskLevel ?? lastRiskLevel,
      }
    : currentVitals;

  return {
    ...data,
    historicalSeries:   filled,
    currentVitals:      filledCurrentVitals,
  };
}