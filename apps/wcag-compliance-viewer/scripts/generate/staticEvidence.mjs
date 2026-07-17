export function buildStaticEvidence({ has, hasAny, fileContaining, filesFor }) {
  const staticSignals = {
    charts: {
      hasSvgOrChart: hasAny(['<svg', 'HorizontalBarChart']),
      files: fileContaining('HorizontalBarChart'),
    },
    focusableStaticContainers: {
      found: has('tabIndex={0}'),
      files: fileContaining('tabIndex={0}'),
    },
    fieldWrappers: {
      files: fileContaining('FieldControlWrapper'),
    },
    colorOnlyStatus: {
      found: hasAny(['green-dot', 'red-dot', 'colorPalette']),
      files: filesFor('green-dot', 'red-dot', 'HorizontalBarChart'),
    },
    clickableLogo: {
      found: has('onClick={() => handleRouteClick'),
      files: fileContaining('onClick={() => handleRouteClick'),
    },
    sessionWarning: {
      found: has('SessionWarning'),
      files: fileContaining('SessionWarning'),
    },
    bypass: {
      foundPossibleSignal: hasAny(['skip', 'main']),
      files: filesFor('NavBar', 'Outlet'),
    },
    routeTitles: {
      found: hasAny(['document.title', 'Helmet']),
      files: filesFor('<title>', 'document.title'),
    },
    ariaLabels: {
      found: has('aria-label'),
      files: fileContaining('aria-label'),
    },
    htmlLanguage: {
      found: has('<html lang="en"'),
      files: fileContaining('<html lang="en"'),
    },
    formErrors: {
      found: has('FormErrorMessage'),
      files: fileContaining('FormErrorMessage'),
    },
    formLabels: {
      found: has('FormLabel'),
      files: fileContaining('FormLabel'),
    },
    customNameRoleValue: {
      found: hasAny(['role="button"', 'tabIndex={0}']),
      files: filesFor('role="button"', 'tabIndex={0}'),
    },
    autocomplete: {
      found: hasAny(['autoComplete', 'autocomplete']),
      files: filesFor('id="email"', 'primary_poc_name'),
    },
    fixedWidthInputs: {
      found: has('w="sm"'),
      files: fileContaining('w="sm"'),
    },
    unstyledControls: {
      found: has('variant="unstyled"'),
      files: fileContaining('variant="unstyled"'),
    },
    navigation: {
      found: has('NavBar'),
      files: fileContaining('NavBar'),
    },
  };

  return {
    staticSignals,
    deterministicEvidence: deterministicSignals(staticSignals)
      .filter((evidence) => evidence.found || !evidence.relevantFiles.includes('Not found')),
  };
}

function deterministicSignals(staticSignals) {
  return [
    signal('dashboard charts or SVGs present', staticSignals.charts.hasSvgOrChart, staticSignals.charts.files),
    signal('focusable static containers present', staticSignals.focusableStaticContainers.found, staticSignals.focusableStaticContainers.files),
    signal('color-coded status or chart styling present', staticSignals.colorOnlyStatus.found, staticSignals.colorOnlyStatus.files),
    signal('clickable logo/navigation image pattern present', staticSignals.clickableLogo.found, staticSignals.clickableLogo.files),
    signal('session warning implementation present', staticSignals.sessionWarning.found, staticSignals.sessionWarning.files),
    signal('skip/main bypass signal present', staticSignals.bypass.foundPossibleSignal, staticSignals.bypass.files),
    signal('route title management signal present', staticSignals.routeTitles.found, staticSignals.routeTitles.files),
    signal('ARIA labels present', staticSignals.ariaLabels.found, staticSignals.ariaLabels.files),
    signal('html lang attribute present', staticSignals.htmlLanguage.found, staticSignals.htmlLanguage.files),
    signal('form error components present', staticSignals.formErrors.found, staticSignals.formErrors.files),
    signal('form labels present', staticSignals.formLabels.found, staticSignals.formLabels.files),
    signal('custom role or focusable container signal present', staticSignals.customNameRoleValue.found, staticSignals.customNameRoleValue.files),
    signal('autocomplete metadata signal present', staticSignals.autocomplete.found, staticSignals.autocomplete.files),
    signal('fixed-width input signal present', staticSignals.fixedWidthInputs.found, staticSignals.fixedWidthInputs.files),
    signal('unstyled controls present', staticSignals.unstyledControls.found, staticSignals.unstyledControls.files),
    signal('shared navigation present', staticSignals.navigation.found, staticSignals.navigation.files),
  ];
}

function signal(signal, found, relevantFiles) {
  return { signal, found, relevantFiles };
}
