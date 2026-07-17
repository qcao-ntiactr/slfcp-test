import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  assessmentPath,
  filterAssessment,
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
  pnpm wcag:export -- <filters...> --format <json|md|csv|html>

Examples:
  pnpm wcag:export -- status=does-not-support --format md
  pnpm wcag:export -- 4.x.x status=partially-supports format=csv
  pnpm wcag:export -- level=AA format=html
  pnpm wcag:export -- needs-verification

Defaults:
  format=json
  output=apps/wcag-compliance-viewer/src/generated/wcagAssessment.export-<filters>.<ext>
`);
}

function escapeMarkdown(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '/')
    .trim();
}

function escapeCsv(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rowsFromTables(tables) {
  return tables.flatMap((table) => table.rows.map((row) => ({ table: table.title, ...row })));
}

function toMarkdown(report) {
  const lines = [
    '# WCAG Assessment Export',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Rows: ${report.summary.total}`,
    '',
  ];

  for (const table of report.tables) {
    lines.push(`## ${table.title}`);
    lines.push('');
    lines.push('| Criteria | Requirement | Conformance | Remarks | How To Verify | How To Reproduce | Relevant Files |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const row of table.rows) {
      lines.push(`| ${escapeMarkdown(row.criteria)} | ${escapeMarkdown(row.requirementSummary)} | ${escapeMarkdown(row.conformanceLevel)} | ${escapeMarkdown(row.remarks)} | ${escapeMarkdown(row.howToVerify)} | ${escapeMarkdown(row.howToReproduce)} | ${escapeMarkdown(row.relevantFiles)} |`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function toCsv(report) {
  const headers = [
    'Table',
    'Criteria',
    'Level',
    'Requirement',
    'Conformance',
    'Remarks',
    'How To Verify',
    'How To Reproduce',
    'Relevant Files',
  ];
  const rows = rowsFromTables(report.tables).map((row) => [
    row.table,
    row.criteria,
    row.level,
    row.requirementSummary,
    row.conformanceLevel,
    row.remarks,
    row.howToVerify,
    row.howToReproduce,
    row.relevantFiles,
  ]);

  return `${[headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')}\n`;
}

function toHtml(report) {
  const body = report.tables.map((table) => `
    <section>
      <h2>${escapeHtml(table.title)}</h2>
      <table>
        <thead>
          <tr>
            <th>Criteria</th>
            <th>Requirement</th>
            <th>Conformance</th>
            <th>Remarks</th>
            <th>How To Verify</th>
            <th>How To Reproduce</th>
            <th>Relevant Files</th>
          </tr>
        </thead>
        <tbody>
          ${table.rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.criteria)}</td>
              <td>${escapeHtml(row.requirementSummary)}</td>
              <td>${escapeHtml(row.conformanceLevel)}</td>
              <td>${escapeHtml(row.remarks)}</td>
              <td>${escapeHtml(row.howToVerify)}</td>
              <td>${escapeHtml(row.howToReproduce)}</td>
              <td>${escapeHtml(row.relevantFiles)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>WCAG Assessment Export</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #172033; }
      table { border-collapse: collapse; width: 100%; margin: 16px 0 32px; }
      th, td { border: 1px solid #d8dee8; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f5f7fb; }
      td { white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h1>WCAG Assessment Export</h1>
    <p>Generated: ${escapeHtml(report.generatedAt)}</p>
    <p>Rows: ${report.summary.total}</p>
    ${body}
  </body>
</html>
`;
}

const filters = parseAssessmentFilters(process.argv.slice(2), {
  allowFormat: true,
  allowEmpty: true,
});

if (filters.help) {
  printUsage();
  process.exit(0);
}

if (filters.unknown.length > 0) {
  console.error(`Unknown filter(s): ${filters.unknown.join(', ')}`);
  printUsage();
  process.exit(1);
}

const format = filters.format ?? 'json';
const assessment = loadAssessment();
const report = makeFilteredAssessment(assessment, filters, assessmentPath);
const filtered = filterAssessment(assessment, filters);
report.summary = filtered.summary;
report.tables = filtered.tables;

const extension = format === 'md' ? 'md' : format;
const outPath = filters.output
  ? path.resolve(process.cwd(), filters.output)
  : path.join(generatedDir, `wcagAssessment.export-${makeSlug(filters)}.${extension}`);

const content = {
  json: `${JSON.stringify(report, null, 2)}\n`,
  md: toMarkdown(report),
  csv: toCsv(report),
  html: toHtml(report),
}[format];

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, content, 'utf8');

console.log(`Generated ${path.relative(repoRoot, outPath)}`);
console.log(`Exported ${report.summary.total} criteria as ${format}.`);
