import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  assessmentPath,
  generatedDir,
  loadAssessment,
  repoRoot,
} from './assessment-utils.mjs';
import { surfaceRules } from './coverage/surfaceRules.mjs';
import { buildWorkflowInventory } from './coverage/workflowInventory.mjs';

const defaultRoutes = ['/', '/dashboard', '/view-requests', '/create-request', '/help', '/common-conditions'];
const frontendRoots = ['apps/frontend/src'];
const defaultJsonOut = path.join(generatedDir, 'wcagTesterCoverageReview.json');
const defaultMarkdownOut = path.join(repoRoot, 'docs/wcag-tester-coverage-review.md');

function printUsage() {
  console.log(`
Usage:
  pnpm wcag:review-coverage -- --base <branch-or-ref>

Examples:
  pnpm wcag:review-coverage
  pnpm wcag:review-coverage -- --base dev
  pnpm wcag:review-coverage -- base=origin/dev
  pnpm wcag:review-coverage -- --json apps/wcag-compliance-viewer/src/generated/review.json
  pnpm wcag:review-coverage -- --markdown docs/wcag-tester-coverage-review.md

What it does:
  Builds a reachable whole-app workflow inventory, compares it to runtime evidence,
  and also reviews branch changes for tester updates.
`);
}

function parseArgs(argv) {
  const options = {
    base: 'dev',
    jsonOut: defaultJsonOut,
    markdownOut: defaultMarkdownOut,
    includeUntracked: true,
    failOnBroken: false,
    help: false,
  };
  const unknown = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '-h' || arg === '--help' || arg === 'help') {
      options.help = true;
      continue;
    }

    const keyValue = arg.match(/^--?([^=\s]+)=(.+)$/) ?? arg.match(/^([^=\s]+)=(.+)$/);
    const key = keyValue?.[1] ?? arg.replace(/^--/, '');
    const value = keyValue?.[2] ?? argv[index + 1];

    if (['base', 'json', 'out', 'output', 'markdown', 'md'].includes(key)) {
      if (!keyValue) index += 1;
      if (key === 'base') options.base = value;
      if (key === 'json' || key === 'out' || key === 'output') options.jsonOut = path.resolve(repoRoot, value);
      if (key === 'markdown' || key === 'md') options.markdownOut = path.resolve(repoRoot, value);
      continue;
    }

    if (key === 'no-untracked') {
      options.includeUntracked = false;
      continue;
    }

    if (key === 'fail-on-broken') {
      options.failOnBroken = true;
      continue;
    }

    unknown.push(arg);
  }

  return { options, unknown };
}

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', options.ignoreErrors ? 'ignore' : 'pipe'],
  }).trim();
}

function tryGit(args) {
  try {
    return runGit(args, { ignoreErrors: true });
  } catch {
    return '';
  }
}

function getDiffNameStatus(base) {
  const output = tryGit(['diff', '--name-status', `${base}...HEAD`]) || tryGit(['diff', '--name-status', base]);
  if (!output) return [];

  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [status, firstPath, secondPath] = line.split(/\t/);
    return {
      status,
      filePath: secondPath ?? firstPath,
      previousPath: secondPath ? firstPath : null,
      source: 'git-diff',
    };
  });
}

function getUntrackedFiles() {
  const output = tryGit(['ls-files', '--others', '--exclude-standard']);
  if (!output) return [];

  return output.split(/\r?\n/).filter(Boolean).map((filePath) => ({
    status: 'A',
    filePath,
    previousPath: null,
    source: 'untracked',
  }));
}

function readCurrentFile(filePath) {
  const fullPath = path.join(repoRoot, filePath);
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : '';
}

function readBaseFile(base, filePath) {
  return tryGit(['show', `${base}:${filePath}`]);
}

function isReviewableSource(filePath) {
  return /^apps\/frontend\/src\//.test(filePath) || /^apps\/backend\/src\//.test(filePath) || /^apps\/backend\/prisma\//.test(filePath);
}

function isFrontendSource(filePath) {
  return frontendRoots.some((root) => filePath.startsWith(`${root}/`));
}

function extractRoutes(text) {
  const routes = new Set();
  const routePatterns = [
    /\bpath\s*=\s*["'`]([^"'`]+)["'`]/g,
    /\bpath\s*:\s*["'`]([^"'`]+)["'`]/g,
    /\bnavigate\(["'`]([^"'`]+)["'`]\)/g,
    /\bto\s*=\s*["'`]([^"'`]+)["'`]/g,
  ];

  for (const pattern of routePatterns) {
    for (const match of text.matchAll(pattern)) {
      const route = match[1]?.trim();
      if (route?.startsWith('/')) routes.add(route);
    }
  }

  return [...routes].filter((route) => !route.startsWith('//'));
}

function classifyFile(change, base) {
  const isDeleted = change.status.startsWith('D');
  const currentText = isDeleted ? '' : readCurrentFile(change.filePath);
  const baseText = change.previousPath || isDeleted
    ? readBaseFile(base, change.previousPath ?? change.filePath)
    : '';
  const text = `${currentText}\n${baseText}`;
  const surfaces = surfaceRules
    .filter((rule) => rule.test({ filePath: change.filePath, text }))
    .map((rule) => ({
      id: rule.id,
      label: rule.label,
      criteria: rule.criteria,
      recommendation: rule.recommendation,
    }));
  const routes = isFrontendSource(change.filePath)
    ? [...new Set([...extractRoutes(currentText), ...extractRoutes(baseText)])]
    : [];

  return {
    ...change,
    kind: isDeleted ? 'removed' : change.status.startsWith('A') ? 'added' : 'changed',
    reviewable: isReviewableSource(change.filePath),
    routes,
    surfaces,
    likelyCriteria: [...new Set(surfaces.flatMap((surface) => surface.criteria))].sort(),
  };
}

function getRows(assessment) {
  return assessment.tables?.flatMap((table) => table.rows ?? []) ?? [];
}

function parseRelevantFiles(value) {
  return [...String(value ?? '').matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

function loadAssessmentIfPresent() {
  if (!existsSync(assessmentPath)) return null;
  try {
    return loadAssessment();
  } catch {
    return null;
  }
}

function findStaleAssessmentReferences(assessment, classifiedChanges) {
  if (!assessment) return [];

  const rows = getRows(assessment);
  const removedPaths = new Set(
    classifiedChanges
      .filter((change) => change.kind === 'removed')
      .flatMap((change) => [change.filePath, change.previousPath].filter(Boolean))
  );
  const changedPaths = new Set(classifiedChanges.map((change) => change.filePath));
  const stale = [];

  for (const row of rows) {
    const relevantFiles = parseRelevantFiles(row.relevantFiles);
    for (const filePath of relevantFiles) {
      const existsNow = existsSync(path.join(repoRoot, filePath));
      if (!existsNow || removedPaths.has(filePath)) {
        stale.push({
          severity: 'broken',
          criteria: row.criteria,
          filePath,
          reason: 'Generated assessment references a file that no longer exists.',
        });
      } else if (changedPaths.has(filePath)) {
        stale.push({
          severity: 'review',
          criteria: row.criteria,
          filePath,
          reason: 'Generated assessment references a file changed on this branch.',
        });
      }
    }
  }

  return stale;
}

function getTestedRoutes(assessment) {
  const fromReport = assessment?.runtimeEvidence?.routesVisited
    ? assessment.runtimeEvidence.baseUrl && Array.isArray(assessment.runtimeEvidence.routes)
    : false;

  if (fromReport) {
    return assessment.runtimeEvidence.routes.map((route) => route.route);
  }

  return defaultRoutes;
}

function summarizeUntestedRoutes(classifiedChanges, testedRoutes) {
  const routeChanges = classifiedChanges.flatMap((change) =>
    change.routes.map((route) => ({ route, filePath: change.filePath, kind: change.kind }))
  );
  const tested = new Set(testedRoutes);

  return routeChanges
    .filter(({ route }) => !tested.has(route))
    .map((routeChange) => ({
      ...routeChange,
      severity: routeChange.kind === 'removed' ? 'review' : 'possibly-stale',
      recommendation: routeChange.kind === 'removed'
        ? 'Remove this route from runtime coverage if it is no longer reachable.'
        : 'Add this route to WCAG_PLAYWRIGHT_ROUTES or a role workflow if it is user-facing.',
    }));
}

function makeRecommendations(classifiedChanges) {
  return classifiedChanges
    .filter((change) => change.reviewable && change.surfaces.length > 0)
    .map((change) => ({
      filePath: change.filePath,
      previousPath: change.previousPath,
      changeType: change.kind,
      source: change.source,
      routes: change.routes,
      likelyCriteria: change.likelyCriteria,
      surfaces: change.surfaces,
    }));
}

function summarizeByStatus({ recommendations, staleReferences, untestedRoutes }) {
  return {
    relevant: recommendations.length,
    possiblyStale: untestedRoutes.filter((item) => item.severity === 'possibly-stale').length,
    broken: staleReferences.filter((item) => item.severity === 'broken').length,
    needsReview: staleReferences.filter((item) => item.severity === 'review').length + untestedRoutes.filter((item) => item.severity === 'review').length,
  };
}

function escapeMarkdown(value) {
  return String(value ?? '').replace(/\|/g, '/').trim();
}

function makeMarkdown(report) {
  const lines = [
    '# WCAG Tester Coverage Review',
    '',
    `Generated: ${report.generatedAt}`,
    `Base ref: \`${report.baseRef}\``,
    `Head ref: \`${report.headRef}\``,
    '',
    '## Summary',
    '',
    `- Changed files reviewed: ${report.summary.changedFiles}`,
    `- Accessibility-relevant recommendations: ${report.summary.recommendations}`,
    `- Whole-app reachable surfaces: ${report.workflowInventory.summary.surfaces}`,
    `- Missing workflow probes: ${report.workflowInventory.summary.workflowProbes}`,
    `- Needs Verification criteria: ${report.workflowInventory.summary.needsVerificationCriteria}`,
    `- New or changed route coverage gaps: ${report.summary.untestedRoutes}`,
    `- Stale generated assessment references: ${report.summary.staleReferences}`,
    `- Broken references: ${report.status.broken}`,
    '',
  ];

  lines.push('## Whole-App Workflow Inventory', '');
  lines.push(`- Reachable frontend files: ${report.workflowInventory.summary.reachableFrontendFiles}/${report.workflowInventory.totalFrontendFiles}`);
  lines.push(`- Discovered routes: ${report.workflowInventory.discoveredRoutes.map((route) => `\`${route}\``).join(', ') || 'None'}`);
  lines.push(`- Runtime-tested routes: ${report.workflowInventory.testedRoutes.map((route) => `\`${route}\``).join(', ') || 'None'}`);
  lines.push(`- Runtime evidence available: ${report.workflowInventory.runtimeEvidenceAvailable ? 'yes' : 'no'}`);
  lines.push('');

  lines.push('## Missing Workflow Probes', '');
  if (report.workflowInventory.workflowProbes.length === 0) {
    lines.push('No missing whole-app workflow probes were detected.', '');
  } else {
    for (const probe of report.workflowInventory.workflowProbes) {
      lines.push(`### ${escapeMarkdown(probe.surface)}: ${escapeMarkdown(probe.filePath)}`, '');
      lines.push(`- Routes: ${probe.routes.map((route) => `\`${route}\``).join(', ') || 'Route not statically inferred'}`);
      if (probe.files?.length > 0) {
        const fileList = probe.files.map((filePath) => `\`${escapeMarkdown(filePath)}\``).join(', ');
        const extra = probe.additionalFileCount > 0 ? `, plus ${probe.additionalFileCount} more` : '';
        lines.push(`- Files: ${fileList}${extra}`);
      }
      lines.push(`- Likely criteria: ${probe.likelyCriteria.map((criterion) => `\`${criterion}\``).join(', ') || 'Not mapped'}`);
      lines.push(`- Reason: ${escapeMarkdown(probe.reason)}`);
      lines.push('- Recommended probe:');
      for (const step of probe.recommendedProbe) lines.push(`  - ${escapeMarkdown(step)}`);
      lines.push('');
    }
  }

  lines.push('## Needs Verification Probe Mapping', '');
  if (report.workflowInventory.needsVerificationCriteria.length === 0) {
    lines.push('No `Needs Verification` criteria were found in the current assessment.', '');
  } else {
    lines.push('| Criteria | Likely Missing Probe Types |');
    lines.push('| --- | --- |');
    for (const item of report.workflowInventory.needsVerificationCriteria) {
      lines.push(`| ${escapeMarkdown(item.criteria)} | ${item.likelyMissingProbeTypes.map((type) => escapeMarkdown(type)).join(', ') || 'No surface mapping found'} |`);
    }
    lines.push('');
  }

  lines.push('## Tester Update Recommendations', '');
  if (report.recommendations.length === 0) {
    lines.push('No accessibility-relevant changed surfaces were detected.', '');
  } else {
    for (const item of report.recommendations) {
      lines.push(`### ${escapeMarkdown(item.filePath)}`, '');
      lines.push(`- Change: ${item.changeType}`);
      if (item.routes.length > 0) lines.push(`- Routes: ${item.routes.map((route) => `\`${route}\``).join(', ')}`);
      lines.push(`- Likely criteria: ${item.likelyCriteria.map((criterion) => `\`${criterion}\``).join(', ') || 'Not mapped'}`);
      for (const surface of item.surfaces) {
        lines.push(`- ${surface.label}: ${surface.recommendation}`);
      }
      lines.push('');
    }
  }

  lines.push('## Route Coverage Gaps', '');
  if (report.untestedRoutes.length === 0) {
    lines.push('No new untested routes were detected from the branch diff.', '');
  } else {
    lines.push('| Route | File | Recommendation |');
    lines.push('| --- | --- | --- |');
    for (const item of report.untestedRoutes) {
      lines.push(`| \`${escapeMarkdown(item.route)}\` | \`${escapeMarkdown(item.filePath)}\` | ${escapeMarkdown(item.recommendation)} |`);
    }
    lines.push('');
  }

  lines.push('## Stale Generated Assessment References', '');
  if (report.staleReferences.length === 0) {
    lines.push('No stale generated assessment file references were detected.', '');
  } else {
    lines.push('| Severity | Criteria | File | Reason |');
    lines.push('| --- | --- | --- | --- |');
    for (const item of report.staleReferences) {
      lines.push(`| ${item.severity} | ${escapeMarkdown(item.criteria)} | \`${escapeMarkdown(item.filePath)}\` | ${escapeMarkdown(item.reason)} |`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

const { options, unknown } = parseArgs(process.argv.slice(2));

if (options.help) {
  printUsage();
  process.exit(0);
}

if (unknown.length > 0) {
  console.error(`Unknown option(s): ${unknown.join(', ')}`);
  printUsage();
  process.exit(1);
}

const diffChanges = getDiffNameStatus(options.base);
const untrackedChanges = options.includeUntracked ? getUntrackedFiles() : [];
const changesByPath = new Map([...diffChanges, ...untrackedChanges].map((change) => [change.filePath, change]));
const changes = [...changesByPath.values()];
const classifiedChanges = changes.map((change) => classifyFile(change, options.base));
const assessment = loadAssessmentIfPresent();
const workflowInventory = buildWorkflowInventory({
  repoRoot,
  generatedDir,
  assessment,
});
const testedRoutes = getTestedRoutes(assessment);
const recommendations = makeRecommendations(classifiedChanges);
const staleReferences = findStaleAssessmentReferences(assessment, classifiedChanges);
const untestedRoutes = summarizeUntestedRoutes(classifiedChanges, testedRoutes);
const headRef = tryGit(['rev-parse', '--short', 'HEAD']) || 'unknown';

const report = {
  generatedAt: new Date().toISOString(),
  baseRef: options.base,
  headRef,
  mode: 'deterministic-branch-diff',
  summary: {
    changedFiles: changes.length,
    reviewableFiles: classifiedChanges.filter((change) => change.reviewable).length,
    recommendations: recommendations.length,
    workflowProbes: workflowInventory.workflowProbes.length,
    reachableSurfaces: workflowInventory.surfaces.length,
    needsVerificationCriteria: workflowInventory.needsVerificationCriteria.length,
    untestedRoutes: untestedRoutes.length,
    staleReferences: staleReferences.length,
  },
  status: summarizeByStatus({ recommendations, staleReferences, untestedRoutes }),
  testedRoutes,
  workflowInventory,
  changedFiles: classifiedChanges,
  recommendations,
  untestedRoutes,
  staleReferences,
};

mkdirSync(path.dirname(options.jsonOut), { recursive: true });
mkdirSync(path.dirname(options.markdownOut), { recursive: true });
writeFileSync(options.jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(options.markdownOut, makeMarkdown(report), 'utf8');

console.log(`Generated ${path.relative(repoRoot, options.jsonOut)}`);
console.log(`Generated ${path.relative(repoRoot, options.markdownOut)}`);
console.log(`Changed files reviewed: ${report.summary.changedFiles}`);
console.log(`Tester recommendations: ${report.summary.recommendations}`);
console.log(`Whole-app reachable surfaces: ${report.summary.reachableSurfaces}`);
console.log(`Missing workflow probes: ${report.summary.workflowProbes}`);
console.log(`Untested route gaps: ${report.summary.untestedRoutes}`);
console.log(`Stale assessment references: ${report.summary.staleReferences}`);

if (options.failOnBroken && report.status.broken > 0) {
  process.exit(1);
}
