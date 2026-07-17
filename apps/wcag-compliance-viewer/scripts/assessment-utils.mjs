import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const appDir = path.resolve(__dirname, '..');
export const repoRoot = path.resolve(appDir, '../..');
export const generatedDir = path.join(appDir, 'src/generated');
export const assessmentPath = path.join(generatedDir, 'wcagAssessment.json');

export const conformanceLevels = new Map([
  ['supports', 'Supports'],
  ['mostly supports', 'Mostly Supports'],
  ['mostly-supports', 'Mostly Supports'],
  ['mostly', 'Mostly Supports'],
  ['partially supports', 'Partially Supports'],
  ['partially-supports', 'Partially Supports'],
  ['partial', 'Partially Supports'],
  ['does not support', 'Does Not Support'],
  ['does-not-support', 'Does Not Support'],
  ['not-support', 'Does Not Support'],
  ['fail', 'Does Not Support'],
  ['needs verification', 'Needs Verification'],
  ['needs-verification', 'Needs Verification'],
  ['needs', 'Needs Verification'],
  ['verify', 'Needs Verification'],
  ['not applicable', 'Not Applicable'],
  ['not-applicable', 'Not Applicable'],
  ['na', 'Not Applicable'],
  ['n/a', 'Not Applicable'],
]);

export function cleanToken(value) {
  return String(value ?? '').trim().replace(/^-+/, '').trim();
}

export function normalizeConformance(value) {
  return conformanceLevels.get(cleanToken(value).toLowerCase());
}

export function isCriteriaFilter(value) {
  return /^\d+(?:\.(?:\d+|x)){0,2}$/i.test(cleanToken(value));
}

export function criteriaFilterToRegex(value) {
  const parts = cleanToken(value).toLowerCase().split('.');
  const regexParts = parts.map((part) =>
    part === 'x'
      ? String.raw`\d+`
      : part.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
  );
  return new RegExp(`^${regexParts.join(String.raw`\.`)}(?:\\b|\\.)`);
}

export function getCriteriaNumber(row) {
  return String(row.criteria ?? '').match(/^\d+(?:\.\d+){0,2}/)?.[0] ?? '';
}

function parseKeyValueFilter(arg, nextArg) {
  const match = arg.match(/^--?([^=\s]+)=(.+)$/) ?? arg.match(/^([^=\s]+)=(.+)$/);
  if (match) return { key: match[1], value: match[2], consumedNext: false };

  const key = cleanToken(arg).toLowerCase();
  if (['conformance', 'status', 'level', 'wcag-level', 'out', 'output', 'format'].includes(key)) {
    return { key, value: nextArg, consumedNext: true };
  }

  return null;
}

export function parseAssessmentFilters(argv, {
  allowFormat = false,
  allowEmpty = false,
} = {}) {
  const filters = {
    criteria: [],
    conformance: [],
    levels: [],
    output: null,
    format: null,
  };
  const unknown = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const normalizedArg = cleanToken(arg);
    const lowerArg = normalizedArg.toLowerCase();

    if (arg === '--' || normalizedArg === '') continue;

    if (lowerArg === 'help' || lowerArg === 'h') {
      return { help: true, filters, unknown };
    }

    const keyValue = parseKeyValueFilter(arg, argv[index + 1]);
    if (keyValue) {
      if (keyValue.consumedNext) index += 1;
      const key = cleanToken(keyValue.key).toLowerCase();
      const value = keyValue.value;

      if (key === 'criteria' || key === 'criterion' || key === 'sc') {
        if (isCriteriaFilter(value)) filters.criteria.push(cleanToken(value).toLowerCase());
        else unknown.push(`${arg} ${value ?? ''}`.trim());
        continue;
      }

      if (key === 'conformance' || key === 'status') {
        const conformance = normalizeConformance(value);
        if (conformance) filters.conformance.push(conformance);
        else unknown.push(`${arg} ${value ?? ''}`.trim());
        continue;
      }

      if (key === 'level' || key === 'wcag-level') {
        const level = cleanToken(value).toUpperCase();
        if (level === 'A' || level === 'AA') filters.levels.push(level);
        else unknown.push(`${arg} ${value ?? ''}`.trim());
        continue;
      }

      if (key === 'out' || key === 'output') {
        filters.output = value ?? null;
        continue;
      }

      if (key === 'format' && allowFormat) {
        const format = cleanToken(value).toLowerCase();
        if (['json', 'md', 'markdown', 'csv', 'html'].includes(format)) {
          filters.format = format === 'markdown' ? 'md' : format;
        } else {
          unknown.push(`${arg} ${value ?? ''}`.trim());
        }
        continue;
      }
    }

    const conformance = normalizeConformance(arg);
    if (conformance) {
      filters.conformance.push(conformance);
      continue;
    }

    if (isCriteriaFilter(arg)) {
      filters.criteria.push(normalizedArg.toLowerCase());
      continue;
    }

    const level = normalizedArg.toUpperCase();
    if (level === 'A' || level === 'AA') {
      filters.levels.push(level);
      continue;
    }

    unknown.push(arg);
  }

  const result = {
    help: false,
    criteria: [...new Set(filters.criteria)],
    conformance: [...new Set(filters.conformance)],
    levels: [...new Set(filters.levels)],
    output: filters.output,
    format: filters.format,
    unknown,
  };

  if (!allowEmpty && result.criteria.length === 0 && result.conformance.length === 0 && result.levels.length === 0) {
    result.empty = true;
  }

  return result;
}

export function makeSlug(filters) {
  const parts = [
    ...(filters.criteria ?? []),
    ...(filters.conformance ?? []),
    ...(filters.levels ?? []).map((level) => `level-${level}`),
  ];

  return (parts.length > 0 ? parts : ['all'])
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'filtered';
}

export function summarize(rows) {
  return {
    total: rows.length,
    byConformance: rows.reduce((acc, row) => {
      acc[row.conformanceLevel] = (acc[row.conformanceLevel] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

export function loadAssessment(inputPath = assessmentPath) {
  if (!existsSync(inputPath)) {
    throw new Error(`Missing ${path.relative(repoRoot, inputPath)}. Run pnpm wcag:generate first.`);
  }

  return JSON.parse(readFileSync(inputPath, 'utf8'));
}

export function filterAssessment(assessment, filters) {
  const criteriaRegexes = (filters.criteria ?? []).map(criteriaFilterToRegex);

  const matchesRow = (row) => {
    const criteriaNumber = getCriteriaNumber(row);
    const matchesCriteria =
      criteriaRegexes.length === 0 ||
      criteriaRegexes.some((regex) => regex.test(criteriaNumber));
    const matchesConformance =
      (filters.conformance ?? []).length === 0 ||
      filters.conformance.includes(row.conformanceLevel);
    const matchesLevel =
      (filters.levels ?? []).length === 0 ||
      filters.levels.includes(row.level);

    return matchesCriteria && matchesConformance && matchesLevel;
  };

  const filteredTables = assessment.tables
    .map((table) => ({
      ...table,
      rows: table.rows.filter(matchesRow),
    }))
    .filter((table) => table.rows.length > 0);

  const rows = filteredTables.flatMap((table) => table.rows);

  return {
    rows,
    tables: filteredTables,
    summary: summarize(rows),
  };
}

export function makeFilteredAssessment(assessment, filters, artifactPath = assessmentPath) {
  const filtered = filterAssessment(assessment, filters);

  return {
    ...assessment,
    generatedAt: new Date().toISOString(),
    filteredFrom: {
      artifactPath: path.relative(repoRoot, artifactPath),
      generatedAt: assessment.generatedAt,
      summary: assessment.summary,
    },
    filters: {
      criteria: filters.criteria ?? [],
      conformance: filters.conformance ?? [],
      levels: filters.levels ?? [],
    },
    summary: filtered.summary,
    tables: filtered.tables,
  };
}
