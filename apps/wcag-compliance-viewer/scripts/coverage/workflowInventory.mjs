import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildReachableFrontendGraph,
  walkFrontendFiles,
} from '../generate/sourceDiscovery.mjs';
import { surfaceRules } from './surfaceRules.mjs';

const routeSpecificSurfaceIds = new Set([
  'route-or-page',
  'form-control',
  'modal-or-overlay',
  'table-or-grid',
  'chart-or-svg',
  'rich-text-or-upload',
  'status-or-feedback',
  'keyboard-handler',
  'style-or-responsive',
  'help-or-contact',
]);

export function buildWorkflowInventory({
  repoRoot,
  generatedDir,
  assessment,
}) {
  const frontendDir = path.join(repoRoot, 'apps/frontend');
  const runtimeEvidence = loadRuntimeEvidence(generatedDir);
  const allFrontendFiles = walkFrontendFiles(frontendDir);
  const reachableGraph = buildReachableFrontendGraph(allFrontendFiles, frontendDir);
  const reachableFiles = reachableGraph.files;
  const discoveredRoutes = reachableGraph.runtimeRoutes.length > 0
    ? reachableGraph.runtimeRoutes
    : ['/'];
  const testedRoutes = getRuntimeRoutes(runtimeEvidence);
  const testedRouteSet = new Set(testedRoutes.map((route) => route.route));
  const surfaces = discoverReachableSurfaces({ repoRoot, reachableFiles });
  const workflowProbes = makeWorkflowProbes({
    discoveredRoutes,
    runtimeEvidence,
    surfaces,
    testedRouteSet,
  });
  const needsVerification = getNeedsVerificationRows(assessment);

  return {
    mode: 'reachable-whole-app',
    frontendEntryFile: path.relative(repoRoot, reachableGraph.entryFile),
    reachableFrontendFiles: reachableFiles.length,
    totalFrontendFiles: allFrontendFiles.length,
    discoveredRoutes,
    testedRoutes: [...testedRouteSet],
    runtimeEvidenceAvailable: Boolean(runtimeEvidence?.available),
    surfaces,
    routeCoverageGaps: discoveredRoutes
      .filter((route) => !testedRouteSet.has(route))
      .map((route) => ({
        route,
        severity: 'missing-runtime-route',
        recommendation: 'Visit this reachable route during WCAG runtime evidence collection.',
      })),
    workflowProbes,
    needsVerificationCriteria: needsVerification.map((row) => ({
      criteria: row.criteria,
      requirementSummary: row.requirementSummary,
      likelyMissingProbeTypes: inferMissingProbeTypes(row),
    })),
    summary: {
      reachableFrontendFiles: reachableFiles.length,
      discoveredRoutes: discoveredRoutes.length,
      testedRoutes: testedRouteSet.size,
      surfaces: surfaces.length,
      workflowProbes: workflowProbes.length,
      needsVerificationCriteria: needsVerification.length,
    },
  };
}

function loadRuntimeEvidence(generatedDir) {
  const runtimePath = path.join(generatedDir, 'wcagRuntimeEvidence.json');
  if (!existsSync(runtimePath)) return null;

  try {
    return JSON.parse(readFileSync(runtimePath, 'utf8'));
  } catch {
    return null;
  }
}

function discoverReachableSurfaces({ repoRoot, reachableFiles }) {
  return reachableFiles.flatMap((file) => {
    const relativePath = path.relative(repoRoot, file);
    const text = readFileSync(file, 'utf8');
    const routeHints = extractDeclaredRoutes(text);
    return surfaceRules
      .filter((rule) => rule.test({ filePath: relativePath, text }))
      .map((rule) => ({
        id: `${rule.id}:${relativePath}`,
        surfaceId: rule.id,
        label: rule.label,
        filePath: relativePath,
        routeHints,
        likelyCriteria: rule.criteria,
        recommendation: rule.recommendation,
        evidenceHints: extractEvidenceHints(rule.id, text),
      }));
  });
}

function getRuntimeRoutes(runtimeEvidence) {
  const directRoutes = runtimeEvidence?.routes ?? [];
  const workflowRoutes = (runtimeEvidence?.workflows ?? [])
    .flatMap((workflow) => workflow.routes ?? []);

  return [...directRoutes, ...workflowRoutes]
    .filter((route) => route?.route)
    .map((route) => ({
      route: route.route,
      userKey: route.userKey,
      role: route.role,
      headings: route.headings ?? [],
      visibleInputs: route.visibleInputs ?? [],
      buttonNames: route.buttonNames ?? [],
      linkNames: route.linkNames ?? [],
      axe: route.axe,
      focusOrder: route.focusOrder ?? [],
      liveRegionCount: route.liveRegionCount ?? 0,
      navTexts: route.navTexts ?? [],
      interactions: route.interactions ?? [],
    }));
}

function makeWorkflowProbes({
  discoveredRoutes,
  runtimeEvidence,
  surfaces,
  testedRouteSet,
}) {
  const probes = [];

  for (const route of discoveredRoutes) {
    if (!testedRouteSet.has(route)) {
      probes.push(routeProbe(route));
    }
  }

  for (const surface of surfaces) {
    const routeTargets = surface.routeHints.length > 0
      ? surface.routeHints
      : inferRoutesForSurface(surface, discoveredRoutes);
    if (!shouldCreateProbe(surface, routeTargets, runtimeEvidence, testedRouteSet)) continue;

    probes.push({
      id: `${surface.surfaceId}:${surface.filePath}`,
      surface: surface.label,
      filePath: surface.filePath,
      routes: routeTargets,
      likelyCriteria: surface.likelyCriteria,
      reason: getProbeReason(surface, routeTargets, testedRouteSet),
      recommendedProbe: makeProbeSteps(surface, routeTargets),
    });
  }

  return dedupeProbes(probes);
}

function shouldCreateProbe(surface, routeTargets, runtimeEvidence, testedRouteSet) {
  if (!routeSpecificSurfaceIds.has(surface.surfaceId)) return true;
  if (routeTargets.length === 0) return false;
  if (routeTargets.some((route) => !testedRouteSet.has(route))) return true;
  if (!runtimeEvidence?.available) return true;

  return !hasDedicatedRuntimeSignal(surface, routeTargets, runtimeEvidence);
}

function hasDedicatedRuntimeSignal(surface, routeTargets, runtimeEvidence) {
  const allRoutes = getRuntimeRoutes(runtimeEvidence);
  const matchingRoutes = allRoutes.filter((route) => routeTargets.includes(route.route));
  if (surface.surfaceId === 'route-or-page') return matchingRoutes.some((route) => route.headings.length > 0);
  if (surface.surfaceId === 'form-control') return matchingRoutes.some((route) => route.visibleInputs.length > 0);
  if (surface.surfaceId === 'keyboard-handler') return matchingRoutes.some((route) => route.focusOrder.length > 0);
  if (surface.surfaceId === 'modal-or-overlay') return hasWorkflowAction(runtimeEvidence, /menu|modal|dialog|popover|drawer|escape|close/i);
  if (surface.surfaceId === 'status-or-feedback') {
    return matchingRoutes.some((route) => route.liveRegionCount > 0) ||
      hasWorkflowAction(runtimeEvidence, /alert|toast|error|validation|status/i);
  }
  if (surface.surfaceId === 'style-or-responsive') return matchingRoutes.some((route) => route.axe);
  if (surface.surfaceId === 'help-or-contact') {
    return matchingRoutes.some((route) =>
      route.route === '/help' ||
      route.navTexts.some((text) => /help|support|contact/i.test(text))
    );
  }
  return false;
}

function hasWorkflowAction(runtimeEvidence, pattern) {
  return (runtimeEvidence?.workflows ?? []).some((workflow) =>
    (workflow.interactions ?? []).some((interaction) =>
      (interaction.actions ?? []).some((action) => pattern.test(action))
    )
  );
}

function routeProbe(route) {
  return {
    id: `route:${route}`,
    surface: 'Reachable route',
    filePath: 'apps/frontend/src/App.tsx',
    routes: [route],
    likelyCriteria: ['2.4.1', '2.4.2', '2.4.6', '3.1.1'],
    reason: 'The router exposes this route, but runtime evidence does not show it was visited.',
    recommendedProbe: [
      `Navigate to ${route}.`,
      'Collect title, heading outline, landmarks, focus order, and axe findings.',
      'Record whether page content is reachable and represented programmatically.',
    ],
  };
}

function getProbeReason(surface, routeTargets, testedRouteSet) {
  const untested = routeTargets.filter((route) => !testedRouteSet.has(route));
  if (untested.length > 0) {
    return `Reachable surface appears on untested route(s): ${untested.join(', ')}.`;
  }
  return 'Runtime evidence does not contain a dedicated interaction signal for this reachable surface.';
}

function makeProbeSteps(surface, routeTargets) {
  const routes = routeTargets.length > 0 ? routeTargets : ['the route that renders this component'];
  const firstStep = `Open ${routes.map((route) => `\`${route}\``).join(', ')}.`;
  const genericSteps = {
    'form-control': [
      'Locate the form fields and submit controls.',
      'Submit the form empty and inspect labels, required-field errors, suggestions, focus movement, and live regions.',
    ],
    'modal-or-overlay': [
      'Open the modal, menu, popover, drawer, or tooltip trigger.',
      'Verify keyboard access, Escape behavior, focus trap, return focus, and accessible name/role/state.',
    ],
    'table-or-grid': [
      'Inspect table/grid headers, sort or filter controls, row/column relationships, and keyboard focus order.',
    ],
    'chart-or-svg': [
      'Inspect images, icons, charts, and SVGs for text alternatives, names/descriptions, legends, and non-color equivalents.',
    ],
    'rich-text-or-upload': [
      'Exercise editor/upload controls with keyboard only.',
      'Check labels, instructions, inserted media alternatives, and upload error messaging.',
    ],
    'status-or-feedback': [
      'Trigger loading, success, error, or async feedback states.',
      'Verify the status is exposed through text or programmatic live/status/alert semantics.',
    ],
    'style-or-responsive': [
      'Run narrow viewport, zoom/reflow, text spacing, focus indicator, and contrast checks on this screen.',
    ],
    'help-or-contact': [
      'Confirm help/contact mechanisms are consistently available and meet target-size requirements.',
    ],
  };

  return [firstStep, ...(genericSteps[surface.surfaceId] ?? [surface.recommendation])];
}

function inferRoutesForSurface(surface, discoveredRoutes) {
  const lowerPath = surface.filePath.toLowerCase();
  const candidates = new Set();

  for (const [pattern, routes] of routeDirectoryMappings) {
    if (pattern.test(lowerPath)) {
      routes.forEach((route) => candidates.add(route));
    }
  }

  for (const route of discoveredRoutes) {
    const normalizedRoute = route.replace(/^\//, '').replaceAll('-', '').toLowerCase();
    if (route !== '/' && normalizedRoute && lowerPath.includes(normalizedRoute)) {
      candidates.add(route);
    }
  }

  return [...candidates].filter((route) => discoveredRoutes.includes(route));
}

const routeDirectoryMappings = [
  [/\/pages\/signinpage\./, ['/login', '/signin']],
  [/\/components\/auth\//, ['/login', '/signin']],
  [/\/components\/requestform\//, ['/create-request']],
  [/\/components\/viewrequests\//, ['/view-requests']],
  [/\/components\/viewdetails\//, ['/view-requests']],
  [/\/components\/commonconditions\//, ['/common-conditions']],
  [/\/components\/dashboard\//, ['/dashboard']],
  [/\/pages\/dashboardpage\./, ['/dashboard']],
  [/\/pages\/helppage\./, ['/help']],
  [/\/pages\/landingpage\./, ['/']],
];

function extractDeclaredRoutes(text) {
  const routes = new Set();
  const patterns = [
    /\bpath\s*=\s*["'`]([^"'`]+)["'`]/g,
    /\bpath\s*:\s*["'`]([^"'`]+)["'`]/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const route = match[1]?.trim();
      if (route?.startsWith('/') && !route.startsWith('//')) routes.add(route);
    }
  }

  return [...routes];
}

function extractEvidenceHints(surfaceId, text) {
  const hints = [];
  if (surfaceId === 'form-control') {
    hints.push(...matches(text, /\b(?:name|id)\s*=\s*["'`]([^"'`]+)["'`]/g).slice(0, 8));
  }
  if (surfaceId === 'modal-or-overlay') {
    hints.push(...matches(text, /\b(?:Modal|Dialog|Popover|Menu|Drawer|Tooltip)[A-Za-z0-9_]*/g).slice(0, 8));
  }
  if (surfaceId === 'chart-or-svg') {
    hints.push(...matches(text, /\b(?:img|svg|Chart|Icon|Logo|Image)[A-Za-z0-9_]*/gi).slice(0, 8));
  }
  return [...new Set(hints)];
}

function matches(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1] ?? match[0]);
}

function getNeedsVerificationRows(assessment) {
  return (assessment?.tables ?? [])
    .flatMap((table) => table.rows ?? [])
    .filter((row) => row.conformanceLevel === 'Needs Verification');
}

function inferMissingProbeTypes(row) {
  const text = `${row.criteria} ${row.requirementSummary} ${row.remarks}`.toLowerCase();
  return surfaceRules
    .filter((rule) => rule.criteria.some((criterion) => text.includes(criterion)))
    .map((rule) => rule.label);
}

function dedupeProbes(probes) {
  const groups = new Map();
  for (const probe of probes) {
    const key = [
      probe.surface,
      probe.routes.join(','),
      probe.likelyCriteria.join(','),
      probe.reason,
    ].join('|');
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        ...probe,
        files: probe.filePath ? [probe.filePath] : [],
      });
      continue;
    }

    if (probe.filePath && !existing.files.includes(probe.filePath)) {
      existing.files.push(probe.filePath);
    }
  }

  return [...groups.values()].map((probe) => ({
    ...probe,
    filePath: probe.files.length === 1
      ? probe.files[0]
      : `${probe.files.length} reachable files`,
    files: probe.files.slice(0, 20),
    additionalFileCount: Math.max(0, probe.files.length - 20),
  }));
}
