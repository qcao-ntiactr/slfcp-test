export function makeHowToReproduce(violations) {
  return violations
    .map((violation, index) => {
      const steps = violation.steps.map((step, stepIndex) => `${stepIndex + 1}. ${step}`).join('<br>');
      return `Violation ${index + 1}: ${violation.title}<br>${steps}`;
    })
    .join('<br><br>');
}

export function validateReproductionViolations(rows) {
  const positiveVerificationPattern = /\b(confirm|verify|ensure|check whether|determine whether)\b/i;
  const observedFailurePattern = /\b(see that|observe that|record any|the violation is|cannot|does not|do not|not |no |missing|lacks?|without|only conveyed|only shown|clip|overflow|unexpected|too-subtle)\b/i;
  const problems = [];

  for (const reportRow of rows) {
    if (!Array.isArray(reportRow.reproductionViolations)) continue;

    reportRow.reproductionViolations.forEach((violation, violationIndex) => {
      if (!violation.title?.trim()) {
        problems.push(`${reportRow.criteria} violation ${violationIndex + 1} is missing a title.`);
      }

      if (!Array.isArray(violation.steps) || violation.steps.length === 0) {
        problems.push(`${reportRow.criteria} violation ${violationIndex + 1} is missing reproduction steps.`);
        return;
      }

      const finalStep = violation.steps.at(-1) ?? '';
      const describesObservedFailure = observedFailurePattern.test(finalStep);
      if (positiveVerificationPattern.test(finalStep) && !describesObservedFailure) {
        problems.push(`${reportRow.criteria} violation ${violationIndex + 1} ends with positive verification wording: "${finalStep}"`);
      }

      if (!describesObservedFailure) {
        problems.push(`${reportRow.criteria} violation ${violationIndex + 1} final step should state the observed failure: "${finalStep}"`);
      }
    });
  }

  if (problems.length > 0) {
    throw new Error(`Invalid WCAG reproduction guidance:\n- ${problems.join('\n- ')}`);
  }
}

export function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function getCriterionKeywords(criterion) {
  return [
    ...criterion.criteria.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [],
    ...criterion.requirementSummary.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [],
  ].filter((word) => ![
    'level',
    'provide',
    'ensure',
    'content',
    'unless',
    'where',
    'with',
    'that',
    'from',
    'when',
    'user',
    'users',
    'required',
  ].includes(word));
}

export function getCriterionId(criterion) {
  return String(criterion.criteria ?? criterion).split(' ')[0];
}
