import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  assessmentPath,
  generatedDir,
  loadAssessment,
  makeFilteredAssessment,
  makeSlug,
  parseAssessmentFilters,
  repoRoot,
} from './assessment-utils.mjs';

function printUsage() {
  console.log(`
Usage:
  pnpm wcag:filter-assessment -- <filters...>

Examples:
  pnpm wcag:filter-assessment -- 4.x.x
  pnpm wcag:filter-assessment -- 4.1.x
  pnpm wcag:filter-assessment -- 4.1.2
  pnpm wcag:filter-assessment -- --conformance "Needs Verification"
  pnpm wcag:filter-assessment -- criteria=4.1.x status=needs-verification
  pnpm wcag:filter-assessment -- level=AA

Filters:
  Criteria prefix/wildcard: 4.x.x, 4.1.x, 4.1.2, criteria=4.1.x
  Conformance/status: Supports, Mostly Supports, Partially Supports,
    Does Not Support, Needs Verification, Not Applicable, status=needs
  WCAG table level: --level A, --level AA, level=A, level=AA
  Output path: --out path/to/file.json, output=path/to/file.json

Multiple criteria filters are ORed together.
Multiple conformance filters are ORed together.
Different filter types are ANDed together.
`);
}

const filters = parseAssessmentFilters(process.argv.slice(2));

if (filters.help) {
  printUsage();
  process.exit(0);
}

if (filters.unknown.length > 0) {
  console.error(`Unknown filter(s): ${filters.unknown.join(', ')}`);
  printUsage();
  process.exit(1);
}

if (filters.empty) {
  console.error('At least one filter is required.');
  printUsage();
  process.exit(1);
}

const assessment = loadAssessment();
const output = makeFilteredAssessment(assessment, filters, assessmentPath);

mkdirSync(generatedDir, { recursive: true });
const outPath = filters.output
  ? path.resolve(process.cwd(), filters.output)
  : path.join(generatedDir, `wcagAssessment.filtered-${makeSlug(filters)}.json`);

writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(`Generated ${path.relative(repoRoot, outPath)}`);
console.log(`Matched ${output.summary.total} of ${assessment.summary?.total ?? assessment.tables.flatMap((table) => table.rows).length} criteria.`);
console.log(JSON.stringify(output.summary.byConformance, null, 2));
