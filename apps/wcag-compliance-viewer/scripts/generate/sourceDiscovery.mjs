import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export function walkFrontendFiles(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    if (ignoredDirectoryNames.has(entry)) continue;

    const fullPath = path.join(dir, entry);
    const stats = statSafe(fullPath);
    if (!stats) continue;

    if (stats.isDirectory()) walkFrontendFiles(fullPath, files);
    if (stats.isFile() && /\.(tsx?|jsx?|html|css)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

export function walkAuditFiles(dir, repoRoot, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    if (ignoredAuditDirectoryNames.has(entry)) continue;

    const fullPath = path.join(dir, entry);
    const relativePath = path.relative(repoRoot, fullPath);
    if (
      relativePath.startsWith('docs/') ||
      relativePath.startsWith('apps/wcag-compliance-viewer/dist') ||
      relativePath === 'pnpm-lock.yaml'
    ) {
      continue;
    }

    const stats = statSafe(fullPath);
    if (!stats) continue;

    if (stats.isDirectory()) walkAuditFiles(fullPath, repoRoot, files);
    if (stats.isFile() && /\.(tsx?|jsx?|html|css|md|json|yml|yaml)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

export function buildReachableFrontendGraph(allFrontendFilesList, frontendDir) {
  const allFrontendFiles = new Set(allFrontendFilesList);
  const graph = new Map(
    allFrontendFilesList.map((file) => {
      const text = readFileSync(file, 'utf8');
      return [file, {
        text,
        imports: parseLocalImports(text, file, allFrontendFiles),
      }];
    })
  );
  const appFile = path.join(frontendDir, 'src/App.tsx');
  const appNode = graph.get(appFile);
  if (!appNode) {
    return {
      entryFile: appFile,
      files: [],
      runtimeRoutes: ['/'],
      surfaceText: '',
      activeReturnText: '',
    };
  }

  const activeReturnText = extractActiveReturnText(appNode.text);
  const activeJsxIdentifiers = extractJsxIdentifiers(activeReturnText);
  const reachable = new Set([appFile]);
  const queue = [];

  for (const localImport of appNode.imports) {
    const isRenderedImport = localImport.specifiers.some((specifier) =>
      activeJsxIdentifiers.has(specifier) || containsIdentifier(activeReturnText, specifier)
    );
    if (localImport.sideEffect || isRenderedImport) {
      queue.push(localImport.file);
    }
  }

  while (queue.length > 0) {
    const currentFile = queue.shift();
    if (!currentFile || reachable.has(currentFile) || !graph.has(currentFile)) continue;

    reachable.add(currentFile);
    for (const localImport of graph.get(currentFile).imports) {
      queue.push(localImport.file);
    }
  }

  const routeText = [...reachable]
    .filter((file) => !/\.(css|scss|sass|less|html)$/.test(file))
    .map((file) => file === appFile ? activeReturnText : graph.get(file)?.text ?? '')
    .join('\n');

  return {
    entryFile: appFile,
    files: [...reachable].filter((file) => graph.has(file)).sort(),
    runtimeRoutes: extractRuntimeRoutes(routeText),
    surfaceText: routeText,
    activeReturnText,
  };
}

const ignoredDirectoryNames = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.next',
  '.turbo',
  'playwright-report',
  'test-results',
]);

const ignoredAuditDirectoryNames = new Set([
  ...ignoredDirectoryNames,
  'generated',
]);

function statSafe(filePath) {
  try {
    return statSync(filePath);
  } catch {
    return null;
  }
}

function resolveLocalImport(importPath, fromFile, allFrontendFiles) {
  if (!importPath.startsWith('.')) return null;

  const basePath = path.resolve(path.dirname(fromFile), importPath);
  const candidates = [
    basePath,
    `${basePath}.tsx`,
    `${basePath}.ts`,
    `${basePath}.jsx`,
    `${basePath}.js`,
    `${basePath}.css`,
    `${basePath}.html`,
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.jsx'),
    path.join(basePath, 'index.js'),
  ];

  return candidates.find((candidate) => allFrontendFiles.has(candidate) || existsSync(candidate)) ?? null;
}

function parseImportSpecifiers(specifierText) {
  if (!specifierText?.trim()) return [];

  const names = [];
  const namespaceMatch = specifierText.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (namespaceMatch) names.push(namespaceMatch[1]);

  const namedBlock = specifierText.match(/\{([^}]+)\}/);
  if (namedBlock) {
    for (const rawName of namedBlock[1].split(',')) {
      const localName = rawName.trim().split(/\s+as\s+/i).pop()?.trim();
      if (localName && /^[A-Za-z_$][\w$]*$/.test(localName)) names.push(localName);
    }
  }

  const defaultCandidate = specifierText
    .replace(/\{[^}]+\}/g, '')
    .replace(/\*\s+as\s+[A-Za-z_$][\w$]*/g, '')
    .split(',')
    .map((part) => part.trim())
    .find((part) => /^[A-Za-z_$][\w$]*$/.test(part));
  if (defaultCandidate) names.push(defaultCandidate);

  return [...new Set(names)];
}

function parseLocalImports(text, fromFile, allFrontendFiles) {
  const imports = [];
  const importStatements = text.match(/^\s*import[\s\S]*?;\s*$/gm) ?? [];

  for (const statement of importStatements) {
    const sideEffectMatch = statement.match(/^\s*import\s+['"]([^'"]+)['"]/);
    const fromMatch = statement.match(/^\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/);
    const specifierText = fromMatch?.[1] ?? '';
    const importPath = sideEffectMatch?.[1] ?? fromMatch?.[2];
    if (!importPath) continue;

    const resolved = resolveLocalImport(importPath, fromFile, allFrontendFiles);
    if (!resolved) continue;

    const sideEffect = !specifierText.trim() || /\.(css|scss|sass|less)$/.test(importPath);
    imports.push({
      file: resolved,
      specifiers: parseImportSpecifiers(specifierText),
      sideEffect,
    });
  }

  return imports;
}

function extractActiveReturnText(text) {
  const appIndex = Math.max(
    text.indexOf('export const App'),
    text.indexOf('function App'),
    text.indexOf('const App')
  );
  const returnIndex = text.indexOf('return', appIndex >= 0 ? appIndex : 0);
  if (returnIndex === -1) return text;

  const afterReturn = text.slice(returnIndex);
  const semicolonIndex = afterReturn.indexOf(';');
  const nextReturnMatch = afterReturn.slice('return'.length).match(/\n\s*return\b/);
  const nextReturnIndex = nextReturnMatch
    ? 'return'.length + (nextReturnMatch.index ?? 0)
    : -1;
  if (nextReturnIndex !== -1 && (semicolonIndex === -1 || nextReturnIndex < semicolonIndex)) {
    return afterReturn.slice(0, nextReturnIndex);
  }

  if (semicolonIndex !== -1) {
    return afterReturn.slice(0, semicolonIndex + 1);
  }

  return afterReturn.slice(0, 20000);
}

function extractJsxIdentifiers(text) {
  const identifiers = new Set();
  const jsxPattern = /<\s*([A-Z][A-Za-z0-9_$]*(?:\.[A-Z][A-Za-z0-9_$]*)?)/g;
  let match;

  while ((match = jsxPattern.exec(text)) !== null) {
    const [rootName] = match[1].split('.');
    identifiers.add(rootName);
  }

  return identifiers;
}

function containsIdentifier(text, identifier) {
  return new RegExp(`\\b${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);
}

function normalizeRoutePath(routePath) {
  if (!routePath || routePath === '*') return null;
  if (routePath.includes(':') || routePath.includes('*')) return null;
  if (routePath === '/') return '/';
  return routePath.startsWith('/') ? routePath : `/${routePath}`;
}

function extractRuntimeRoutes(text) {
  const routes = new Set();
  if (/<Route\b[^>]*\bindex\b/i.test(text)) routes.add('/');

  const routePattern = /<Route\b[^>]*\bpath=(?:["']([^"']+)["']|\{[`'"]([^`'"]+)[`'"]\})/g;
  let match;
  while ((match = routePattern.exec(text)) !== null) {
    const route = normalizeRoutePath(match[1] ?? match[2]);
    if (route) routes.add(route);
  }

  return [...routes];
}
