import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { createGenerationConfig } from './generate/config.mjs';
import {
  chunk,
  getCriterionId,
  getCriterionKeywords,
  makeHowToReproduce,
  validateReproductionViolations,
} from './generate/criteriaHelpers.mjs';
import { extractDocxCriteria } from './generate/docxCriteria.mjs';
import { fallbackCriteria } from './generate/fallbackCriteria.mjs';
import { makeMarkdown } from './generate/markdownReport.mjs';
import {
  buildReachableFrontendGraph,
  walkAuditFiles,
  walkFrontendFiles,
} from './generate/sourceDiscovery.mjs';
import { buildStaticEvidence } from './generate/staticEvidence.mjs';

const require = createRequire(import.meta.url);
const {
  repoRoot,
  frontendDir,
  backendDir,
  devEnvDir,
  docsDir,
  generatedDir,
  markdownOut,
  jsonOut,
  runtimeEvidenceOut,
  tokenUsageOut,
  tokenUsageMarkdownOut,
  envPath,
  runtimeOnly,
  openAiApiKey,
  aiModel,
  aiBatchSize,
  aiMaxFiles,
  aiMaxCharsPerFile,
  aiMaxRetries,
  aiRetryBaseDelayMs,
  frontendRoles,
  playwrightEnabled,
  playwrightBaseUrl,
  playwrightBackendBaseUrl,
  playwrightForceMockAuth,
  playwrightLoginUsers,
  playwrightLoginUserKey,
  selectedPlaywrightLogin,
  playwrightEmail,
  playwrightPassword,
  playwrightRoutesFromEnv,
  playwrightWorkflowEnabled,
  playwrightWorkflowUserKeys,
  playwrightMaxTabs,
  playwrightAutoStartFrontend,
  playwrightFrontendStartupTimeoutMs,
  playwrightAutoStartBackend,
  playwrightPrepareDevEnv,
  playwrightSeedBackend,
  playwrightBackendStartupTimeoutMs,
  playwrightBackendSeedInput,
  sourceDocx,
  toLoginEnvPrefix,
  playwrightRoutes: configuredPlaywrightRoutes,
} = createGenerationConfig(import.meta.url);
let playwrightRoutes = configuredPlaywrightRoutes;
const runStartedAt = Date.now();
let runtimeEvidence = {
  enabled: playwrightEnabled,
  available: false,
  baseUrl: playwrightBaseUrl,
  routes: [],
  summary: ['Playwright runtime evidence has not run yet.'],
};
const tokenUsageRequests = [];

function formatDuration(startedAt) {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
}

function logProgress(message) {
  const elapsed = formatDuration(runStartedAt).padStart(6, ' ');
  console.log(`[wcag ${elapsed}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runSetupCommand(command, args, {
  cwd = repoRoot,
  input,
  label = `${command} ${args.join(' ')}`,
} = {}) {
  logProgress(`${label} started.`);
  try {
    const output = execFileSync(command, args, {
      cwd,
      input,
      env: process.env,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    logProgress(`${label} completed.`);
    return output;
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout).trim() : '';
    const stderr = error.stderr ? String(error.stderr).trim() : '';
    const details = [stdout, stderr].filter(Boolean).join(' | ').slice(0, 4000);
    throw new Error(`${label} failed: ${error.message}${details ? ` ${details}` : ''}`);
  }
}



const rel = (file) => path.relative(repoRoot, file);
const allFrontendSourceFiles = walkFrontendFiles(frontendDir);
const reachableFrontend = buildReachableFrontendGraph(allFrontendSourceFiles, frontendDir);
const sourceFiles = reachableFrontend.files.length > 0 ? reachableFrontend.files : [reachableFrontend.entryFile].filter((file) => existsSync(file));
const reachableFrontendFiles = new Set(sourceFiles.map((file) => rel(file)));
const routerDiscoveredPlaywrightRoutes = reachableFrontend.runtimeRoutes;
if (!playwrightRoutesFromEnv) {
  playwrightRoutes = routerDiscoveredPlaywrightRoutes.length > 0 ? routerDiscoveredPlaywrightRoutes : ['/'];
} else {
  playwrightRoutes = [...new Set([...routerDiscoveredPlaywrightRoutes, ...playwrightRoutes])];
}
if (routerDiscoveredPlaywrightRoutes.length === 0 && !playwrightRoutesFromEnv) {
  playwrightRoutes = [];
}
const fileText = new Map(
  sourceFiles.map((file) => [
    file,
    readFileSync(file, 'utf8'),
  ])
);
const allSource = [...fileText.values()].join('\n');
const reachableSurfaceText = `${reachableFrontend.surfaceText ?? ''}\n${[...fileText.entries()]
  .filter(([file]) => file !== reachableFrontend.entryFile && !/\.(css|scss|sass|less|html)$/.test(file))
  .map(([, text]) => text)
  .join('\n')}`;
function shouldIncludeAuditFile(file) {
  const relativePath = rel(file);
  if (relativePath.startsWith('apps/frontend/src/')) return reachableFrontendFiles.has(relativePath);
  if (relativePath.startsWith('apps/frontend/')) {
    return reachableFrontendFiles.has(relativePath)
      || relativePath === 'apps/frontend/index.html'
      || relativePath === 'apps/frontend/package.json'
      || relativePath === 'apps/frontend/vite.config.ts';
  }
  return true;
}
const auditFileText = new Map(
  walkAuditFiles(repoRoot, repoRoot)
    .filter(shouldIncludeAuditFile)
    .map((file) => [
      rel(file),
      readFileSync(file, 'utf8'),
    ])
);
const fileContaining = (needle) => {
  const found = [...fileText.entries()].filter(([, text]) => text.includes(needle)).map(([file]) => `\`${rel(file)}\``);
  return found.length ? [...new Set(found)].join(', ') : 'Not found in reviewed source.';
};
const has = (needle) => allSource.includes(needle);
const hasAny = (needles) => needles.some((needle) => has(needle));
const filesFor = (...needles) => needles.map((needle) => fileContaining(needle)).join('<br>');

const { staticSignals, deterministicEvidence } = buildStaticEvidence({
  has,
  hasAny,
  fileContaining,
  filesFor,
});

const docxCriteria = extractDocxCriteria(sourceDocx, fallbackCriteria);
const usedBuiltInCriteriaFallback = docxCriteria.length === 0;
const criteria = usedBuiltInCriteriaFallback ? fallbackCriteria : docxCriteria;
const docxMatches = docxCriteria.map((criterion) => criterion.criteria);

logProgress(`Source .docx: ${sourceDocx && existsSync(sourceDocx) ? path.relative(repoRoot, sourceDocx) : 'not found'}.`);
logProgress(`Criteria loaded: ${criteria.length} (${usedBuiltInCriteriaFallback ? 'built-in fallback' : `${docxMatches.length} matched from .docx`}).`);
logProgress(`Reachable frontend graph: ${sourceFiles.length}/${allFrontendSourceFiles.length} files from ${path.relative(repoRoot, reachableFrontend.entryFile)}.`);
logProgress(`Router-discovered runtime routes: ${routerDiscoveredPlaywrightRoutes.join(', ') || 'none'}.`);
logProgress(`Playwright routes to visit: ${playwrightRoutes.join(', ') || 'none'}.`);
logProgress(`Repository index ready: ${auditFileText.size} files available for AI context.`);

function scoreAuditFile(filePath, text, criteriaBatch) {
  const haystack = `${filePath}\n${text}`.toLowerCase();
  const keywords = criteriaBatch.flatMap(getCriterionKeywords);
  const keywordScore = keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0);
  const appWeight = filePath.startsWith('apps/frontend/src') ? 8 : filePath.startsWith('packages/') ? 4 : 1;
  const accessibilitySignals = [
    'aria-',
    'role=',
    'tabindex',
    'onclick',
    'formlabel',
    'formerrormessage',
    'autocomplete',
    'button',
    'input',
    'select',
    'modal',
    'toast',
    'status',
    'heading',
    'image',
    'svg',
    'chart',
  ].reduce((score, signal) => score + (haystack.includes(signal) ? 2 : 0), 0);

  return keywordScore * 3 + appWeight + accessibilitySignals;
}

function getRelevantAuditFiles(criteriaBatch) {
  return [...auditFileText.entries()]
    .map(([filePath, text]) => ({
      filePath,
      text,
      score: scoreAuditFile(filePath, text, criteriaBatch),
    }))
    .filter((file) => file.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, aiMaxFiles)
    .map((file) => ({
      filePath: file.filePath,
      text: file.text.length > aiMaxCharsPerFile
        ? `${file.text.slice(0, aiMaxCharsPerFile)}\n/* truncated */`
        : file.text,
    }));
}

function getDeterministicEvidenceForCriteria(criteriaBatch) {
  const criteriaText = criteriaBatch
    .flatMap((criterion) => getCriterionKeywords(criterion))
    .join(' ');

  return deterministicEvidence.filter((evidence) => {
    const haystack = `${evidence.signal} ${evidence.relevantFiles}`.toLowerCase();
    return getCriterionKeywords({ criteria: evidence.signal, requirementSummary: haystack })
      .some((keyword) => criteriaText.includes(keyword) || haystack.includes(keyword));
  });
}

async function isUrlAvailable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function getPlaywrightFrontendPort() {
  const url = new URL(playwrightBaseUrl);
  if (url.port) return url.port;
  return url.protocol === 'https:' ? '443' : '80';
}

function getPlaywrightFrontendHost() {
  return new URL(playwrightBaseUrl).hostname || 'localhost';
}

function getFrontendViteCommand() {
  const viteBin = path.join(frontendDir, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
  if (existsSync(viteBin)) {
    return { command: viteBin, prefixArgs: [] };
  }

  return { command: 'pnpm', prefixArgs: ['exec', 'vite'] };
}

function getBackendTsxCommand() {
  const tsxBin = path.join(backendDir, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
  if (existsSync(tsxBin)) {
    return { command: tsxBin, args: ['api/src/server.ts'] };
  }

  return { command: 'pnpm', args: ['--filter', '@slfcp/backend', 'prod'] };
}

function getBackendHealthUrl() {
  return new URL('/healthcheck', playwrightBackendBaseUrl).toString();
}

async function stopManagedProcess(childProcess) {
  if (!childProcess || childProcess.exitCode !== null) return;

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        if (childProcess.pid) process.kill(-childProcess.pid, 'SIGKILL');
      } catch {
        childProcess.kill('SIGKILL');
      }
      resolve();
    }, 5000);

    childProcess.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    try {
      if (childProcess.pid) {
        process.kill(-childProcess.pid, 'SIGTERM');
      } else {
        childProcess.kill('SIGTERM');
      }
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });
}

function ensureLocalEnvFile(targetPath, sourcePath, label) {
  if (existsSync(targetPath) || !existsSync(sourcePath)) return;

  copyFileSync(sourcePath, targetPath);
  logProgress(`Created ${label} from ${path.relative(repoRoot, sourcePath)}.`);
}

function prepareLocalBackendEnvironment() {
  if (!playwrightPrepareDevEnv) {
    return ['Local backend service preparation was disabled.'];
  }

  const summary = [];
  ensureLocalEnvFile(
    path.join(backendDir, '.env'),
    path.join(devEnvDir, 'backend.local.env.example'),
    path.relative(repoRoot, path.join(backendDir, '.env'))
  );
  ensureLocalEnvFile(
    path.join(frontendDir, '.env.local'),
    path.join(devEnvDir, 'frontend.local.env.example'),
    path.relative(repoRoot, path.join(frontendDir, '.env.local'))
  );

  runSetupCommand('docker', ['compose', '-f', path.join(devEnvDir, 'docker-compose.yml'), 'up', '-d', '--build'], {
    label: 'WCAG dev service stack',
  });
  summary.push('Docker dev service stack is running.');

  runSetupCommand('pnpm', ['--filter', './packages/**', 'build'], {
    label: 'Workspace package build',
  });
  summary.push('Workspace packages are built for backend imports.');

  runSetupCommand('pnpm', ['--filter', '@slfcp/backend', 'prisma:generate'], {
    label: 'Backend Prisma client generation',
  });
  runSetupCommand('pnpm', ['--filter', '@slfcp/backend', 'prisma:migrate:deploy'], {
    label: 'Backend Prisma migrations',
  });
  summary.push('Backend Prisma client and migrations are prepared.');

  if (playwrightSeedBackend) {
    runSetupCommand('pnpm', ['--filter', '@slfcp/backend', 'seed'], {
      input: playwrightBackendSeedInput,
      label: 'Backend seed data',
    });
    summary.push('Backend seed data command completed.');
  } else {
    summary.push('Backend seed data was not run. Set WCAG_PLAYWRIGHT_SEED_BACKEND=true for fresh databases.');
  }

  return summary;
}

async function startManagedBackend() {
  if (!playwrightAutoStartBackend) {
    return {
      started: false,
      available: false,
      stop: async () => undefined,
      summary: [`Backend was not reachable at ${playwrightBackendBaseUrl}; automatic backend startup is disabled.`],
    };
  }

  const summary = [];
  try {
    summary.push(...prepareLocalBackendEnvironment());
  } catch (error) {
    return {
      started: false,
      available: false,
      stop: async () => undefined,
      summary: [`Backend preparation failed: ${error.message}`],
    };
  }

  const backendCommand = getBackendTsxCommand();
  const recentLogs = [];
  const rememberLog = (chunk) => {
    const lines = chunk.toString().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    recentLogs.push(...lines);
    recentLogs.splice(0, Math.max(0, recentLogs.length - 12));
  };

  logProgress(`Playwright runtime audit starting backend from ${path.relative(repoRoot, backendDir)}: ${path.basename(backendCommand.command)} ${backendCommand.args.join(' ')}`);
  const childProcess = spawn(backendCommand.command, backendCommand.args, {
    cwd: backendDir,
    detached: true,
    env: {
      ...process.env,
      PORT: new URL(playwrightBackendBaseUrl).port || '3000',
      FRONTEND_URL: new URL(playwrightBaseUrl).origin,
      AUTH_MODE: process.env.AUTH_MODE ?? 'mock',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  childProcess.stdout?.on('data', rememberLog);
  childProcess.stderr?.on('data', rememberLog);

  let earlyExit = null;
  let spawnError = null;
  childProcess.once('error', (error) => {
    spawnError = error;
  });
  childProcess.once('exit', (code, signal) => {
    earlyExit = { code, signal };
  });

  const healthUrl = getBackendHealthUrl();
  const startedAt = Date.now();
  while (Date.now() - startedAt < playwrightBackendStartupTimeoutMs) {
    if (await isUrlAvailable(healthUrl)) {
      logProgress(`Playwright runtime audit backend is reachable at ${healthUrl}.`);
      return {
        started: true,
        available: true,
        stop: async () => {
          logProgress('Stopping managed Playwright backend server.');
          await stopManagedProcess(childProcess);
        },
        summary: [...summary, `Started managed backend at ${playwrightBackendBaseUrl}.`],
      };
    }

    if (earlyExit || spawnError) {
      break;
    }

    await sleep(1000);
  }

  await stopManagedProcess(childProcess);

  const reason = spawnError
    ? `backend process could not start: ${spawnError.message}`
    : earlyExit
    ? `backend process exited with code ${earlyExit.code ?? 'null'} and signal ${earlyExit.signal ?? 'null'}`
    : `backend did not become reachable within ${(playwrightBackendStartupTimeoutMs / 1000).toFixed(0)}s`;
  const logSuffix = recentLogs.length > 0 ? ` Recent backend logs: ${recentLogs.join(' | ')}` : '';

  return {
    started: true,
    available: false,
    stop: async () => undefined,
    summary: [...summary, `Backend was not reachable at ${playwrightBackendBaseUrl}: ${reason}.${logSuffix}`],
  };
}

async function ensurePlaywrightBackend() {
  const healthUrl = getBackendHealthUrl();
  if (await isUrlAvailable(healthUrl)) {
    return {
      started: false,
      available: true,
      stop: async () => undefined,
      summary: [`Using existing backend at ${playwrightBackendBaseUrl}.`],
    };
  }

  logProgress(`Playwright runtime audit did not find an existing backend at ${healthUrl}.`);
  return startManagedBackend();
}

async function startManagedFrontend() {
  if (!playwrightAutoStartFrontend) {
    return {
      started: false,
      available: false,
      stop: async () => undefined,
      summary: [`Frontend was not reachable at ${playwrightBaseUrl}; automatic frontend startup is disabled.`],
    };
  }

  const port = getPlaywrightFrontendPort();
  const host = getPlaywrightFrontendHost();
  const viteCommand = getFrontendViteCommand();
  const args = [
    ...viteCommand.prefixArgs,
    '--host',
    host,
    '--port',
    port,
    '--strictPort',
  ];
  const recentLogs = [];
  const rememberLog = (chunk) => {
    const lines = chunk.toString().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    recentLogs.push(...lines);
    recentLogs.splice(0, Math.max(0, recentLogs.length - 12));
  };

  logProgress(`Playwright runtime audit starting frontend from ${path.relative(repoRoot, frontendDir)}: ${path.basename(viteCommand.command)} ${args.join(' ')}`);
  const childProcess = spawn(viteCommand.command, args, {
    cwd: frontendDir,
    detached: true,
    env: {
      ...process.env,
      BROWSER: 'none',
      VITE_API_URL: playwrightBackendBaseUrl,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  childProcess.stdout?.on('data', rememberLog);
  childProcess.stderr?.on('data', rememberLog);

  let earlyExit = null;
  let spawnError = null;
  childProcess.once('error', (error) => {
    spawnError = error;
  });
  childProcess.once('exit', (code, signal) => {
    earlyExit = { code, signal };
  });

  const startedAt = Date.now();
  while (Date.now() - startedAt < playwrightFrontendStartupTimeoutMs) {
    if (await isUrlAvailable(playwrightBaseUrl)) {
      logProgress(`Playwright runtime audit frontend is reachable at ${playwrightBaseUrl}.`);
      return {
        started: true,
        available: true,
        stop: async () => {
          logProgress('Stopping managed Playwright frontend server.');
          await stopManagedProcess(childProcess);
        },
        summary: [`Started managed frontend at ${playwrightBaseUrl}.`],
      };
    }

    if (earlyExit || spawnError) {
      break;
    }

    await sleep(1000);
  }

  await stopManagedProcess(childProcess);

  const reason = spawnError
    ? `frontend process could not start: ${spawnError.message}`
    : earlyExit
    ? `frontend process exited with code ${earlyExit.code ?? 'null'} and signal ${earlyExit.signal ?? 'null'}`
    : `frontend did not become reachable within ${(playwrightFrontendStartupTimeoutMs / 1000).toFixed(0)}s`;
  const logSuffix = recentLogs.length > 0 ? ` Recent frontend logs: ${recentLogs.join(' | ')}` : '';

  return {
    started: true,
    available: false,
    stop: async () => undefined,
    summary: [`Frontend was not reachable at ${playwrightBaseUrl}: ${reason}.${logSuffix}`],
  };
}

async function ensurePlaywrightFrontend() {
  if (await isUrlAvailable(playwrightBaseUrl)) {
    return {
      started: false,
      available: true,
      stop: async () => undefined,
      summary: [`Using existing frontend at ${playwrightBaseUrl}.`],
    };
  }

  logProgress(`Playwright runtime audit did not find an existing frontend at ${playwrightBaseUrl}.`);
  return startManagedFrontend();
}

function describeRuntimeIssue(issue) {
  return [
    issue.type,
    issue.message,
    issue.selector,
    issue.impact,
    issue.count ? `${issue.count} occurrence(s)` : '',
  ].filter(Boolean).join(' - ');
}

function getPlaywrightLogin(userKey = playwrightLoginUserKey) {
  return playwrightLoginUsers[userKey] ?? selectedPlaywrightLogin;
}

function getPlaywrightUserEmail(userKey = playwrightLoginUserKey) {
  const login = getPlaywrightLogin(userKey);
  const prefix = toLoginEnvPrefix(userKey);
  return process.env.WCAG_PLAYWRIGHT_EMAIL ?? process.env[`${prefix}EMAIL`] ?? login.email;
}

function getSelectedPlaywrightUser(userKey = playwrightLoginUserKey) {
  const login = getPlaywrightLogin(userKey);
  const email = getPlaywrightUserEmail(userKey);
  return {
    id: login.id ?? email,
    displayName: login.displayName ?? login.label,
    role: login.role,
    accessToken: 'mock.jwt.token',
    tenantId: 'tenant-xyz',
    email: login.id ?? email,
    userPrincipalName: email,
    ...(login.federalAgencyId ? { federalAgencyId: login.federalAgencyId } : {}),
    ...(login.federalAgencyAbbr ? { federalAgencyAbbr: login.federalAgencyAbbr } : {}),
    ...(typeof login.canConcur === 'boolean' ? { canConcur: login.canConcur } : {}),
    ...(typeof login.isEntityActive === 'boolean' ? { isEntityActive: login.isEntityActive } : {}),
  };
}

async function configurePlaywrightMockAuth(page, userKey = playwrightLoginUserKey) {
  const login = getPlaywrightLogin(userKey);
  const email = getPlaywrightUserEmail(userKey);
  if (!playwrightForceMockAuth) {
    return {
      attempted: false,
      success: false,
      userKey,
      email,
      role: login.role,
      message: 'Mock auth seeding was disabled.',
    };
  }

  const user = getSelectedPlaywrightUser(userKey);
  await page.route('**/auth/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authMode: 'mock',
        entraConfigured: false,
        loginGovConfigured: false,
      }),
    });
  });
  await page.addInitScript((mockUser) => {
    window.localStorage.setItem('token', 'mock.jwt.token');
    window.localStorage.setItem('user', JSON.stringify(mockUser));
    window.localStorage.removeItem('refreshToken');
    window.sessionStorage.removeItem('refreshToken');
  }, user);

  return {
    attempted: false,
    success: true,
    userKey,
    email,
    role: login.role,
    message: 'Seeded selected mock user into browser storage and forced /auth/config to mock mode.',
  };
}

async function tryMockLogin(page) {
  try {
    await page.goto(new URL('/login', playwrightBaseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const emailInput = page.getByLabel(/email address/i).first();
    const passwordInput = page.getByLabel(/password/i).first();
    if (await emailInput.count() === 0 || await passwordInput.count() === 0) {
      return {
        attempted: true,
        success: false,
        userKey: playwrightLoginUserKey,
        email: playwrightEmail,
        role: selectedPlaywrightLogin.role,
        message: 'Mock login form was not found.',
      };
    }

    await emailInput.fill(playwrightEmail);
    await passwordInput.fill(playwrightPassword);
    await page.getByRole('button', { name: /log in|sign in/i }).first().click();
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);

    const currentPath = new URL(page.url()).pathname;
    return {
      attempted: true,
      success: !['/login', '/signin'].includes(currentPath),
      userKey: playwrightLoginUserKey,
      email: playwrightEmail,
      role: selectedPlaywrightLogin.role,
      message: `After login current path is ${currentPath}.`,
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      userKey: playwrightLoginUserKey,
      email: playwrightEmail,
      role: selectedPlaywrightLogin.role,
      message: error.message,
    };
  }
}

async function runAxe(page) {
  try {
    const axePath = require.resolve('axe-core/axe.min.js');
    await page.addScriptTag({ path: axePath });
    return await page.evaluate(async () => {
      const results = await window.axe.run(document, {
        resultTypes: ['violations', 'incomplete'],
      });
      return {
        violations: results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          tags: violation.tags,
          nodes: violation.nodes.slice(0, 5).map((node) => ({
            target: node.target,
            failureSummary: node.failureSummary,
          })),
        })),
        incomplete: results.incomplete.map((item) => ({
          id: item.id,
          impact: item.impact,
          help: item.help,
          tags: item.tags,
          nodes: item.nodes.slice(0, 5).map((node) => ({
            target: node.target,
            failureSummary: node.failureSummary,
          })),
        })),
      };
    });
  } catch (error) {
    return {
      error: error.message,
      violations: [],
      incomplete: [],
    };
  }
}

async function collectFocusOrder(page) {
  const seen = [];
  for (let index = 0; index < playwrightMaxTabs; index += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        role: element.getAttribute('role'),
        ariaLabel: element.getAttribute('aria-label'),
        text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || null,
        tabIndex: element.getAttribute('tabindex'),
        visible: rect.width > 0 && rect.height > 0,
        outline: style.outline,
        boxShadow: style.boxShadow,
      };
    });
    if (active) seen.push(active);
  }
  return seen;
}

async function collectRouteEvidence(page, route, options = {}) {
  const url = new URL(route, playwrightBaseUrl).toString();
  const routeStartedAt = Date.now();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

    const domEvidence = await page.evaluate(() => {
      const getLabelText = (input) => {
        if (input.id) {
          const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
          if (label?.textContent?.trim()) return label.textContent.trim();
        }
        return input.getAttribute('aria-label') || input.getAttribute('aria-labelledby') || '';
      };

      const images = [...document.querySelectorAll('img')];
      const controls = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [tabindex]')];
      const inputs = [...document.querySelectorAll('input, select, textarea')];
      const ids = [...document.querySelectorAll('[id]')].map((element) => element.id).filter(Boolean);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      const getAccessibleName = (element) =>
        element.getAttribute('aria-label')
        || element.getAttribute('title')
        || element.textContent?.trim().replace(/\s+/g, ' ')
        || element.getAttribute('value')
        || '';
      const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: heading.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '',
      }));
      const linkNames = [...document.querySelectorAll('a[href]')]
        .filter((link) => {
          const rect = link.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((link) => ({
          text: getAccessibleName(link).slice(0, 100),
          href: link.getAttribute('href'),
        }))
        .slice(0, 40);
      const navTexts = [...document.querySelectorAll('nav, [role="navigation"]')]
        .map((nav) => nav.textContent?.trim().replace(/\s+/g, ' ').slice(0, 300) || '')
        .filter(Boolean);
      const buttonNames = [...document.querySelectorAll('button, [role="button"]')]
        .filter((button) => {
          const rect = button.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((button) => getAccessibleName(button).slice(0, 100))
        .filter(Boolean)
        .slice(0, 60);
      const visibleInputs = inputs
        .filter((input) => {
          const rect = input.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((input) => ({
          id: input.id || null,
          name: input.getAttribute('name'),
          type: input.getAttribute('type'),
          ariaLabel: input.getAttribute('aria-label'),
          autocomplete: input.getAttribute('autocomplete'),
        }))
        .slice(0, 80);
      const smallTargets = controls
        .map((control) => {
          const rect = control.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return null;
          return {
            tag: control.tagName.toLowerCase(),
            role: control.getAttribute('role'),
            name: getAccessibleName(control).slice(0, 80),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter(Boolean)
        .filter((control) => control.width < 24 || control.height < 24)
        .slice(0, 20);

      return {
        title: document.title,
        htmlLang: document.documentElement.lang || null,
        headings,
        duplicateIds: [...new Set(duplicateIds)].slice(0, 20),
        linkNames,
        navTexts,
        buttonNames,
        visibleInputs,
        smallTargets,
        landmarkCounts: {
          header: document.querySelectorAll('header, [role="banner"]').length,
          nav: document.querySelectorAll('nav, [role="navigation"]').length,
          main: document.querySelectorAll('main, [role="main"]').length,
          footer: document.querySelectorAll('footer, [role="contentinfo"]').length,
        },
        skipLinks: [...document.querySelectorAll('a[href^="#"]')]
          .map((link) => link.textContent?.trim())
          .filter((text) => text && /skip|main/i.test(text)),
        missingAltImages: images
          .filter((image) => !image.hasAttribute('alt'))
          .slice(0, 20)
          .map((image) => image.getAttribute('src') || image.outerHTML.slice(0, 120)),
        unlabeledInputs: inputs
          .filter((input) => !getLabelText(input))
          .slice(0, 20)
          .map((input) => ({
            tag: input.tagName.toLowerCase(),
            type: input.getAttribute('type'),
            id: input.id || null,
            name: input.getAttribute('name'),
          })),
        unnamedControls: controls
          .filter((control) => {
            const name = control.getAttribute('aria-label')
              || control.getAttribute('title')
              || control.textContent?.trim()
              || control.getAttribute('value');
            return !name;
          })
          .slice(0, 20)
          .map((control) => ({
            tag: control.tagName.toLowerCase(),
            role: control.getAttribute('role'),
            id: control.id || null,
            tabIndex: control.getAttribute('tabindex'),
          })),
        liveRegionCount: document.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          bodyScrollWidth: document.body.scrollWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
        },
      };
    });

    const axe = await runAxe(page);
    const focusOrder = await collectFocusOrder(page);
    const issues = [
      ...domEvidence.missingAltImages.map((item) => ({
        type: 'missing-image-alt',
        message: `Image without alt attribute: ${item}`,
      })),
      ...domEvidence.unlabeledInputs.map((item) => ({
        type: 'unlabeled-input',
        message: `Input lacks an accessible label: ${JSON.stringify(item)}`,
      })),
      ...domEvidence.unnamedControls.map((item) => ({
        type: 'unnamed-control',
        message: `Focusable/control element lacks a name: ${JSON.stringify(item)}`,
      })),
      ...(domEvidence.landmarkCounts.main === 0 ? [{
        type: 'missing-main-landmark',
        message: 'No main landmark was found on the rendered route.',
      }] : []),
      ...(domEvidence.skipLinks.length === 0 ? [{
        type: 'missing-skip-link',
        message: 'No skip-to-main style link was found.',
      }] : []),
      ...(domEvidence.viewport.documentScrollWidth > domEvidence.viewport.width ? [{
        type: 'horizontal-overflow',
        message: `Document scroll width ${domEvidence.viewport.documentScrollWidth}px exceeds viewport ${domEvidence.viewport.width}px.`,
      }] : []),
      ...domEvidence.duplicateIds.map((id) => ({
        type: 'duplicate-id',
        message: `Duplicate id found in rendered DOM: ${id}`,
      })),
      ...domEvidence.smallTargets.map((target) => ({
        type: 'small-target',
        message: `Target is smaller than 24x24 CSS px: ${JSON.stringify(target)}`,
      })),
      ...axe.violations.map((violation) => ({
        type: 'axe-violation',
        impact: violation.impact,
        message: `${violation.id}: ${violation.help}`,
        selector: violation.nodes[0]?.target?.join(', '),
        count: violation.nodes.length,
      })),
      ...axe.incomplete.map((item) => ({
        type: 'axe-incomplete',
        impact: item.impact,
        message: `${item.id}: ${item.help}`,
        selector: item.nodes[0]?.target?.join(', '),
        count: item.nodes.length,
      })),
    ];

    return {
      route,
      userKey: options.userKey ?? playwrightLoginUserKey,
      role: options.role ?? selectedPlaywrightLogin.role,
      url: page.url(),
      status: 'visited',
      elapsedSeconds: Number(((Date.now() - routeStartedAt) / 1000).toFixed(1)),
      ...domEvidence,
      axe,
      focusOrder,
      issues,
    };
  } catch (error) {
    return {
      route,
      userKey: options.userKey ?? playwrightLoginUserKey,
      role: options.role ?? selectedPlaywrightLogin.role,
      url,
      status: 'failed',
      error: error.message,
      elapsedSeconds: Number(((Date.now() - routeStartedAt) / 1000).toFixed(1)),
      issues: [{
        type: 'route-visit-failed',
        message: error.message,
      }],
    };
  }
}

async function safeVisibleCount(locator) {
  try {
    return await locator.count();
  } catch {
    return 0;
  }
}

async function clickIfVisible(page, locator, label, evidence) {
  try {
    if (await locator.count() === 0) {
      evidence.actions.push(`${label}: not found`);
      return false;
    }

    const target = locator.first();
    if (!(await target.isVisible({ timeout: 1000 }).catch(() => false))) {
      evidence.actions.push(`${label}: found but not visible`);
      return false;
    }

    await target.click({ timeout: 3000 });
    await page.waitForTimeout(300);
    evidence.actions.push(`${label}: clicked`);
    return true;
  } catch (error) {
    evidence.actions.push(`${label}: click failed (${error.message})`);
    return false;
  }
}

async function collectInteractionSnapshot(page) {
  return page.evaluate(() => {
    const textOf = (element) => element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '';
    return {
      dialogs: [...document.querySelectorAll('[role="dialog"], dialog')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map(textOf)
        .slice(0, 5),
      menus: [...document.querySelectorAll('[role="menu"], [role="listbox"]')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map(textOf)
        .slice(0, 5),
      alerts: [...document.querySelectorAll('[role="alert"], [aria-live]')]
        .map(textOf)
        .filter(Boolean)
        .slice(0, 8),
      visibleButtons: [...document.querySelectorAll('button')]
        .filter((button) => {
          const rect = button.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((button) => button.getAttribute('aria-label') || textOf(button))
        .filter(Boolean)
        .slice(0, 20),
      visibleInputs: [...document.querySelectorAll('input, select, textarea')]
        .filter((input) => {
          const rect = input.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((input) => ({
          id: input.id || null,
          name: input.getAttribute('name'),
          type: input.getAttribute('type'),
          ariaLabel: input.getAttribute('aria-label'),
          autocomplete: input.getAttribute('autocomplete'),
        }))
        .slice(0, 25),
    };
  });
}

async function runCommonWorkflowInteractions(page, route, evidence) {
  if (route === '/view-requests') {
    await clickIfVisible(page, page.getByRole('button', { name: /filter/i }), 'View Requests filter control', evidence);
    evidence.snapshots.push({ after: 'filter', ...(await collectInteractionSnapshot(page)) });
    await page.keyboard.press('Escape').catch(() => undefined);
    await clickIfVisible(page, page.getByRole('button', { name: /sort/i }), 'View Requests sort control', evidence);
    evidence.snapshots.push({ after: 'sort', ...(await collectInteractionSnapshot(page)) });
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  if (route === '/create-request') {
    evidence.actions.push(`Create Request visible field count: ${await safeVisibleCount(page.locator('input, textarea, select'))}`);
    await clickIfVisible(page, page.getByRole('button', { name: /create frequency|add frequency/i }), 'Create frequency control', evidence);
    evidence.snapshots.push({ after: 'create-frequency', ...(await collectInteractionSnapshot(page)) });
    await page.keyboard.press('Escape').catch(() => undefined);
    await clickIfVisible(page, page.getByRole('button', { name: /save draft/i }), 'Save Draft control', evidence);
    evidence.snapshots.push({ after: 'save-draft-attempt', ...(await collectInteractionSnapshot(page)) });
  }

  if (route === '/common-conditions') {
    await clickIfVisible(page, page.getByRole('tab', { name: /submissions/i }), 'Common Conditions submissions tab', evidence);
    evidence.snapshots.push({ after: 'submissions-tab', ...(await collectInteractionSnapshot(page)) });
    await clickIfVisible(page, page.getByRole('button', { name: /add new common condition|add new condition/i }), 'Add New Condition control', evidence);
    evidence.snapshots.push({ after: 'add-new-condition', ...(await collectInteractionSnapshot(page)) });
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  if (route === '/dashboard') {
    await clickIfVisible(page, page.getByRole('button', { name: /last|days|month|year|timeframe/i }), 'Dashboard timeframe/filter control', evidence);
    evidence.snapshots.push({ after: 'dashboard-filter', ...(await collectInteractionSnapshot(page)) });
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  const actionButton = page.getByRole('button', { name: /actions|open actions|more|menu/i });
  await clickIfVisible(page, actionButton, `${route} action/menu control`, evidence);
  evidence.snapshots.push({ after: 'generic-action-menu', ...(await collectInteractionSnapshot(page)) });
  await page.keyboard.press('Escape').catch(() => undefined);
}

function getWorkflowRoutesForLogin(login) {
  const baseRoutes = ['/', '/view-requests', '/help'];
  if (login.role === frontendRoles.ntia) {
    return [...baseRoutes, '/dashboard', '/create-request', '/common-conditions'];
  }
  if (login.role === frontendRoles.federal) {
    return [...baseRoutes, '/common-conditions'];
  }
  if (login.role === frontendRoles.commercial) {
    return [...baseRoutes, '/create-request'];
  }
  return baseRoutes;
}

async function collectWorkflowEvidence(browser, userKey) {
  const login = getPlaywrightLogin(userKey);
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const workflowStartedAt = Date.now();

  try {
    const auth = await configurePlaywrightMockAuth(page, userKey);
    const routes = [];
    const interactions = [];

    for (const route of getWorkflowRoutesForLogin(login)) {
      logProgress(`Playwright workflow ${userKey} visiting ${route}.`);
      const routeEvidence = await collectRouteEvidence(page, route, {
        userKey,
        role: login.role,
      });
      routes.push(routeEvidence);

      const interactionEvidence = {
        userKey,
        role: login.role,
        route,
        finalUrl: routeEvidence.url,
        actions: [],
        snapshots: [],
      };

      if (routeEvidence.status === 'visited') {
        await runCommonWorkflowInteractions(page, route, interactionEvidence);
        interactionEvidence.focusOrderAfterInteractions = await collectFocusOrder(page);
      }

      interactions.push(interactionEvidence);
    }

    const issues = routes.flatMap((route) =>
      (route.issues ?? []).slice(0, 10).map((issue) => ({
        route: route.route,
        userKey,
        role: login.role,
        ...issue,
      }))
    );

    return {
      userKey,
      email: getPlaywrightUserEmail(userKey),
      role: login.role,
      auth,
      status: 'completed',
      elapsedSeconds: Number(((Date.now() - workflowStartedAt) / 1000).toFixed(1)),
      routes,
      interactions,
      issues,
    };
  } catch (error) {
    return {
      userKey,
      email: getPlaywrightUserEmail(userKey),
      role: login.role,
      status: 'failed',
      error: error.message,
      elapsedSeconds: Number(((Date.now() - workflowStartedAt) / 1000).toFixed(1)),
      routes: [],
      interactions: [],
      issues: [{
        type: 'workflow-failed',
        message: error.message,
      }],
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function runPlaywrightAudit() {
  if (!playwrightEnabled) {
    return {
      enabled: false,
      available: false,
      baseUrl: playwrightBaseUrl,
      backendBaseUrl: playwrightBackendBaseUrl,
      routes: [],
      summary: ['Playwright runtime evidence was disabled.'],
    };
  }

  if (playwrightRoutes.length === 0) {
    return {
      enabled: true,
      available: false,
      skipped: true,
      baseUrl: playwrightBaseUrl,
      backendBaseUrl: playwrightBackendBaseUrl,
      routes: [],
      workflows: [],
      summary: ['Playwright runtime evidence skipped because no reachable runtime routes were selected.'],
    };
  }

  logProgress(`Playwright runtime audit checking ${playwrightBaseUrl}.`);
  const managedBackend = await ensurePlaywrightBackend();
  if (!managedBackend.available) {
    logProgress(`Playwright runtime audit skipped: ${managedBackend.summary.join(' ')}`);
    return {
      enabled: true,
      available: false,
      baseUrl: playwrightBaseUrl,
      backendBaseUrl: playwrightBackendBaseUrl,
      backend: managedBackend,
      routes: [],
      summary: managedBackend.summary,
    };
  }

  const managedFrontend = await ensurePlaywrightFrontend();
  if (!managedFrontend.available) {
    logProgress(`Playwright runtime audit skipped: ${managedFrontend.summary.join(' ')}`);
    await managedBackend.stop();
    return {
      enabled: true,
      available: false,
      baseUrl: playwrightBaseUrl,
      backendBaseUrl: playwrightBackendBaseUrl,
      backend: managedBackend,
      frontend: managedFrontend,
      routes: [],
      summary: managedFrontend.summary,
    };
  }

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: process.env.WCAG_PLAYWRIGHT_HEADLESS !== 'false' });
  } catch (error) {
    logProgress(`Playwright runtime audit unavailable: ${error.message}`);
    return {
      enabled: true,
      available: false,
      baseUrl: playwrightBaseUrl,
      backendBaseUrl: playwrightBackendBaseUrl,
      backend: managedBackend,
      frontend: managedFrontend,
      routes: [],
      summary: [`Playwright runtime audit could not start: ${error.message}`],
    };
  } finally {
    if (!browser) {
      await managedFrontend.stop();
      await managedBackend.stop();
    }
  }

  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    const login = playwrightForceMockAuth
      ? await configurePlaywrightMockAuth(page)
      : await tryMockLogin(page);
    logProgress(`Playwright login: ${login.success ? 'succeeded' : 'not confirmed'} (${login.message})`);

    const routes = [];
    for (const route of playwrightRoutes) {
      logProgress(`Playwright visiting ${route}.`);
      const evidence = await collectRouteEvidence(page, route);
      routes.push(evidence);
      logProgress(`Playwright ${route}: ${evidence.status}, ${evidence.issues?.length ?? 0} issue signal(s), ${evidence.elapsedSeconds}s.`);
    }

    const workflows = [];
    if (playwrightWorkflowEnabled) {
      for (const userKey of playwrightWorkflowUserKeys) {
        logProgress(`Playwright workflow started for ${userKey}.`);
        const workflow = await collectWorkflowEvidence(browser, userKey);
        workflows.push(workflow);
        logProgress(`Playwright workflow ${userKey}: ${workflow.status}, ${workflow.routes.length} route(s), ${workflow.issues?.length ?? 0} issue signal(s), ${workflow.elapsedSeconds}s.`);
      }
    }

    const routeSummary = routes.flatMap((route) =>
      (route.issues ?? []).slice(0, 12).map((issue) => `${route.userKey ?? playwrightLoginUserKey} ${route.route}: ${describeRuntimeIssue(issue)}`)
    );
    const workflowSummary = workflows.flatMap((workflow) => [
      `${workflow.userKey} workflow (${workflow.role}) ${workflow.status}: visited ${workflow.routes.length} route(s), ${workflow.issues?.length ?? 0} issue signal(s)`,
      ...workflow.routes.map((route) => `${workflow.userKey} ${route.route}: final URL ${route.url}, ${route.issues?.length ?? 0} issue signal(s)`),
      ...workflow.interactions.flatMap((interaction) =>
        interaction.actions.slice(0, 8).map((action) => `${workflow.userKey} ${interaction.route}: ${action}`)
      ),
      ...workflow.issues.slice(0, 20).map((issue) => `${workflow.userKey} ${issue.route}: ${describeRuntimeIssue(issue)}`),
    ]);
    const summary = [...routeSummary, ...workflowSummary];

    return {
      enabled: true,
      available: true,
      baseUrl: playwrightBaseUrl,
      backendBaseUrl: playwrightBackendBaseUrl,
      backend: managedBackend,
      frontend: managedFrontend,
      login,
      routes,
      workflows,
      summary,
    };
  } finally {
    await browser.close();
    await managedFrontend.stop();
    await managedBackend.stop();
  }
}

function getRuntimeEvidenceForCriteria(criteriaBatch) {
  if (!runtimeEvidence.available) {
    return runtimeEvidence.summary;
  }

  const criteriaText = criteriaBatch.flatMap(getCriterionKeywords).join(' ');
  const likelyRelevant = runtimeEvidence.summary.filter((summaryItem) => {
    const normalized = summaryItem.toLowerCase();
    return getCriterionKeywords({ criteria: summaryItem, requirementSummary: normalized })
      .some((keyword) => criteriaText.includes(keyword) || normalized.includes(keyword));
  });

  return (likelyRelevant.length > 0 ? likelyRelevant : runtimeEvidence.summary.slice(0, 30));
}

function allRuntimeRoutes() {
  if (!runtimeEvidence.available) return [];

  return [
    ...(runtimeEvidence.routes ?? []),
    ...(runtimeEvidence.workflows ?? []).flatMap((workflow) => workflow.routes ?? []),
  ].filter((route) => route.status === 'visited');
}

function allWorkflowInteractions() {
  if (!runtimeEvidence.available) return [];

  return (runtimeEvidence.workflows ?? []).flatMap((workflow) => workflow.interactions ?? []);
}

function hasRuntimeIssue(match) {
  return allRuntimeRoutes().flatMap((route) => route.issues ?? []).some((issue) => {
    const text = `${issue.type ?? ''} ${issue.message ?? ''}`.toLowerCase();
    return match(text, issue);
  });
}

function sourceContains(pattern) {
  if (pattern instanceof RegExp) return pattern.test(allSource);
  return allSource.includes(pattern);
}

function sourceFilesContaining(...needles) {
  const matches = new Set();
  for (const [file, text] of fileText.entries()) {
    if (needles.some((needle) => needle instanceof RegExp ? needle.test(text) : text.includes(needle))) {
      matches.add(rel(file));
    }
  }
  return [...matches].slice(0, 20);
}

function summarizeRouteTitles() {
  const routes = allRuntimeRoutes();
  const titles = routes.map((route) => `${route.userKey ?? playwrightLoginUserKey} ${route.route}: "${route.title || 'missing'}"`).slice(0, 20);
  const uniqueTitles = new Set(routes.map((route) => route.title).filter(Boolean));
  const missingOrGeneric = routes.filter((route) => !route.title || /^vite|react app|slfcp$/i.test(route.title.trim()));

  return {
    status: missingOrGeneric.length === 0 && uniqueTitles.size > 1 ? 'supports' : 'violation',
    observations: [
      `${routes.length} runtime route views checked for document.title.`,
      `Observed titles: ${titles.join('; ') || 'none'}.`,
      missingOrGeneric.length > 0
        ? `Generic or missing titles found on: ${missingOrGeneric.map((route) => `${route.userKey ?? playwrightLoginUserKey} ${route.route}`).join(', ')}.`
        : 'Rendered routes expose non-empty page titles, with page-specific title variation observed.',
    ],
  };
}

function summarizeLanguageOfPage() {
  const routes = allRuntimeRoutes();
  const invalid = routes.filter((route) => !route.htmlLang || !/^[a-z]{2,3}(-[a-z0-9]+)?$/i.test(route.htmlLang));
  return {
    status: invalid.length === 0 && routes.length > 0 ? 'supports' : 'violation',
    observations: [
      `${routes.length} runtime route views checked for <html lang>.`,
      invalid.length > 0
        ? `Missing or invalid lang on: ${invalid.map((route) => `${route.route} (${route.htmlLang || 'missing'})`).join(', ')}.`
        : `All rendered routes reported html lang values: ${[...new Set(routes.map((route) => route.htmlLang))].join(', ')}.`,
      `Static source signal for <html lang="en">: ${staticSignals.htmlLanguage.found ? 'present' : 'not found'}.`,
    ],
  };
}

function summarizeParsing() {
  const duplicateRoutes = allRuntimeRoutes().filter((route) => route.duplicateIds?.length > 0);
  return {
    status: duplicateRoutes.length === 0 ? 'supports' : 'violation',
    observations: [
      `${allRuntimeRoutes().length} rendered route views checked for duplicate IDs and axe parsing-related violations.`,
      duplicateRoutes.length > 0
        ? `Duplicate IDs observed: ${duplicateRoutes.map((route) => `${route.route}: ${route.duplicateIds.join(', ')}`).join('; ')}.`
        : 'No duplicate IDs were observed in rendered runtime route views.',
      hasRuntimeIssue((text) => text.includes('duplicate-id') || text.includes('aria-'))
        ? 'Runtime issue signals include parsing/name/id related findings; inspect route evidence.'
        : 'No explicit duplicate-id issue signal was collected.',
    ],
  };
}

function summarizePageStructure() {
  const routes = allRuntimeRoutes();
  const missingMain = routes.filter((route) => (route.landmarkCounts?.main ?? 0) === 0);
  const missingHeading = routes.filter((route) => (route.headings ?? []).length === 0);
  return {
    status: missingMain.length === 0 && missingHeading.length === 0 && routes.length > 0 ? 'mostly-supports' : 'violation',
    observations: [
      `${routes.length} rendered route views checked for main landmarks and headings.`,
      missingMain.length > 0
        ? `Routes without a main landmark: ${missingMain.map((route) => `${route.userKey ?? playwrightLoginUserKey} ${route.route}`).join(', ')}.`
        : 'Every rendered route view exposed a main landmark.',
      missingHeading.length > 0
        ? `Routes without headings: ${missingHeading.map((route) => `${route.userKey ?? playwrightLoginUserKey} ${route.route}`).join(', ')}.`
        : 'Every rendered route view exposed at least one heading.',
    ],
  };
}

function summarizeKeyboardAndFocus() {
  const routes = allRuntimeRoutes();
  const focusSamples = routes.flatMap((route) => route.focusOrder ?? []);
  const namedControlsProblems = hasRuntimeIssue((text) => text.includes('unnamed-control') || text.includes('unlabeled-input'));
  const focusWithoutVisibleStyle = focusSamples.filter((sample) => {
    const outline = String(sample.outline ?? '').toLowerCase();
    const boxShadow = String(sample.boxShadow ?? '').toLowerCase();
    return (!outline || outline === 'none' || outline === '0px none rgb(0, 0, 0)') && (!boxShadow || boxShadow === 'none');
  });

  return {
    status: namedControlsProblems || focusWithoutVisibleStyle.length > 0 ? 'violation' : 'mostly-supports',
    observations: [
      `${focusSamples.length} tab stops sampled across runtime route and workflow views.`,
      namedControlsProblems
        ? 'Runtime evidence includes unnamed controls or unlabeled inputs that can affect keyboard/screen-reader operation.'
        : 'No unnamed controls or unlabeled inputs were collected in runtime issue signals.',
      focusWithoutVisibleStyle.length > 0
        ? `${focusWithoutVisibleStyle.length} sampled focused elements did not expose an outline or box-shadow style in the browser snapshot.`
        : 'Sampled focused elements exposed an outline or box-shadow style.',
      `Custom focusable/role signal in source: ${staticSignals.customNameRoleValue.found ? 'present' : 'not found'}.`,
    ],
  };
}

function summarizeContrast() {
  const routes = allRuntimeRoutes();
  const contrastViolations = routes.flatMap((route) =>
    [
      ...(route.axe?.violations ?? []),
      ...(route.axe?.incomplete ?? []),
    ].filter((item) => item.id === 'color-contrast')
      .map((item) => `${route.userKey ?? playwrightLoginUserKey} ${route.route}: ${item.help} (${item.nodes?.length ?? 0} sampled node(s))`)
  );

  return {
    status: contrastViolations.length > 0 ? 'violation' : 'mostly-supports',
    observations: [
      `${routes.length} runtime route views checked with axe color-contrast rules.`,
      contrastViolations.length > 0
        ? `Axe contrast findings/incompletes: ${contrastViolations.slice(0, 10).join('; ')}.`
        : 'No axe color-contrast violations or incompletes were reported in sampled routes.',
      'This does not replace manual contrast sampling for every visual state, but it gives concrete runtime evidence for the sampled pages.',
    ],
  };
}

function summarizeResponsiveAndSpacing() {
  const overflowRoutes = allRuntimeRoutes().filter((route) => route.viewport?.documentScrollWidth > route.viewport?.width);
  return {
    status: overflowRoutes.length > 0 || staticSignals.fixedWidthInputs.found ? 'partially-supports' : 'mostly-supports',
    observations: [
      `${allRuntimeRoutes().length} route views checked for horizontal overflow at the configured runtime viewport.`,
      overflowRoutes.length > 0
        ? `Horizontal overflow observed on: ${overflowRoutes.map((route) => `${route.userKey ?? playwrightLoginUserKey} ${route.route}`).join(', ')}.`
        : 'No horizontal overflow was observed at the configured runtime viewport.',
      `Fixed-width input source signal: ${staticSignals.fixedWidthInputs.found ? `present in ${staticSignals.fixedWidthInputs.files}` : 'not found'}.`,
      'The current automated run does not yet emulate 200% text-only zoom or injected WCAG text-spacing CSS, so residual risk remains for resize/text-spacing criteria.',
    ],
  };
}

function summarizeLinksAndNavigation() {
  const routes = allRuntimeRoutes();
  const unnamedLinks = hasRuntimeIssue((text) => text.includes('unnamed-control') && text.includes('"tag":"a"'));
  const navTexts = routes.flatMap((route) => route.navTexts ?? []).filter(Boolean);
  const linkNames = routes.flatMap((route) => route.linkNames ?? []).filter((link) => link.text);
  return {
    status: unnamedLinks ? 'violation' : 'mostly-supports',
    observations: [
      `${linkNames.length} visible links sampled across runtime route views.`,
      unnamedLinks
        ? 'At least one runtime link/control lacked an accessible name.'
        : 'Sampled visible links exposed non-empty link text or accessible names.',
      `Navigation text samples: ${[...new Set(navTexts)].slice(0, 6).join(' | ') || 'none'}.`,
      `Shared navigation source signal: ${staticSignals.navigation.found ? 'present' : 'not found'}.`,
    ],
  };
}

function summarizeConsistentHelp() {
  const routes = allRuntimeRoutes();
  const withoutHelp = routes.filter((route) => {
    const haystack = `${(route.navTexts ?? []).join(' ')} ${(route.linkNames ?? []).map((link) => link.text).join(' ')}`.toLowerCase();
    return !haystack.includes('help');
  });
  return {
    status: withoutHelp.length === 0 && routes.length > 0 ? 'supports' : 'violation',
    observations: [
      `${routes.length} rendered route views checked for a Help mechanism in navigation/link text.`,
      withoutHelp.length > 0
        ? `No Help mechanism found in sampled nav/link text on: ${withoutHelp.map((route) => `${route.userKey ?? playwrightLoginUserKey} ${route.route}`).join(', ')}.`
        : 'Every sampled route view exposed a Help mechanism in navigation/link text.',
    ],
  };
}

function summarizeTargetSize() {
  const smallTargets = allRuntimeRoutes().flatMap((route) =>
    (route.smallTargets ?? []).map((target) => `${route.userKey ?? playwrightLoginUserKey} ${route.route}: ${target.name || target.tag} ${target.width}x${target.height}`)
  );
  return {
    status: smallTargets.length > 0 ? 'violation' : 'mostly-supports',
    observations: [
      `${allRuntimeRoutes().length} route views checked for rendered targets below 24x24 CSS px.`,
      smallTargets.length > 0
        ? `Small targets observed: ${smallTargets.slice(0, 20).join('; ')}.`
        : 'No visible sampled target was below 24x24 CSS px.',
    ],
  };
}

function summarizeErrorsAndSuggestions() {
  const interactions = allWorkflowInteractions();
  const alerts = interactions.flatMap((interaction) =>
    (interaction.snapshots ?? []).flatMap((snapshot) => snapshot.alerts ?? [])
      .map((alert) => `${interaction.userKey} ${interaction.route}: ${alert}`)
  );
  const requiredOnly = alerts.filter((alert) => /\brequired\b/i.test(alert) && !/\b(example|format|must|between|valid|enter|select|choose)\b/i.test(alert));
  return {
    status: alerts.length > 0 && requiredOnly.length === 0 ? 'mostly-supports' : alerts.length > 0 ? 'partially-supports' : 'unknown',
    observations: [
      `${interactions.length} workflow interaction snapshots checked for alert/live-region error text.`,
      alerts.length > 0
        ? `Observed error/status text: ${alerts.slice(0, 12).join('; ')}.`
        : 'No visible alert/live-region error text was captured during scripted workflow interactions.',
      requiredOnly.length > 0
        ? `Some errors appear to state only that input is required, without a correction suggestion: ${requiredOnly.slice(0, 6).join('; ')}.`
        : 'No required-only error message pattern was detected in captured alerts.',
      `Static form error component signal: ${staticSignals.formErrors.found ? 'present' : 'not found'}.`,
    ],
  };
}

function summarizeAutocomplete() {
  const inputs = [
    ...allRuntimeRoutes().flatMap((route) => route.visibleInputs ?? []),
    ...allWorkflowInteractions().flatMap((interaction) =>
      (interaction.snapshots ?? []).flatMap((snapshot) => snapshot.visibleInputs ?? [])
    ),
  ];
  const loginInputs = inputs.filter((input) => /email|password|username/i.test(`${input.id ?? ''} ${input.name ?? ''} ${input.type ?? ''}`));
  const missing = loginInputs.filter((input) => !input.autocomplete);
  return {
    status: missing.length === 0 && loginInputs.length > 0 ? 'mostly-supports' : 'partially-supports',
    observations: [
      `${loginInputs.length} login/identity-related runtime inputs sampled for autocomplete metadata.`,
      missing.length > 0
        ? `Sampled identity inputs without autocomplete: ${missing.map((input) => `${input.id ?? input.name ?? input.type}`).slice(0, 10).join(', ')}.`
        : 'Sampled login/identity inputs exposed autocomplete metadata.',
      `Static autocomplete source signal: ${staticSignals.autocomplete.found ? 'present' : 'not found'}.`,
    ],
  };
}

function summarizeNoFlashingOrMotion() {
  const motionSignals = sourceFilesContaining(/marquee|blink|setInterval|animation:|@keyframes|requestAnimationFrame/i);
  const likelyFlashing = motionSignals.filter((file) => {
    const text = auditFileText.get(file) ?? '';
    return /flash|blink|strobe|setInterval|requestAnimationFrame/i.test(text);
  });
  return {
    status: likelyFlashing.length === 0 ? 'supports' : 'unknown',
    observations: [
      `${sourceFiles.length} frontend source files scanned for flashing/moving-content implementation patterns.`,
      likelyFlashing.length > 0
        ? `Potential flashing/timed-motion files need review: ${likelyFlashing.join(', ')}.`
        : 'No source patterns for flashing, strobing, marquee, or requestAnimationFrame-driven motion were found in frontend source.',
      motionSignals.length > 0
        ? `General CSS/interval animation signals were found in: ${motionSignals.slice(0, 10).join(', ')}.`
        : 'No general animation/timer source signals were found.',
    ],
  };
}

function summarizeOrientation() {
  const orientationFiles = sourceFilesContaining(/screen\.orientation|orientationchange|@media\s*\([^)]*orientation/i);
  return {
    status: orientationFiles.length === 0 ? 'supports' : 'unknown',
    observations: [
      `${sourceFiles.length} frontend source files scanned for orientation locking/restriction patterns.`,
      orientationFiles.length > 0
        ? `Orientation-related code found for review: ${orientationFiles.join(', ')}.`
        : 'No source patterns for orientation locking or orientation-specific blocking were found.',
    ],
  };
}

function summarizeMultipleWays() {
  const routeSet = new Set(allRuntimeRoutes().map((route) => route.route));
  const navRouteTexts = new Set(allRuntimeRoutes().flatMap((route) => route.navTexts ?? []));
  const hasHelpPage = routeSet.has('/help');
  const hasSearchOrIndex = sourceContains(/search|sitemap|site map|index of pages/i);
  return {
    status: hasSearchOrIndex ? 'mostly-supports' : 'partially-supports',
    observations: [
      `Sampled routes: ${[...routeSet].join(', ') || 'none'}.`,
      `Persistent navigation samples observed: ${[...navRouteTexts].slice(0, 6).join(' | ') || 'none'}.`,
      hasHelpPage ? 'A Help route was sampled.' : 'A Help route was not sampled.',
      hasSearchOrIndex
        ? 'A source signal for search/site-map/index functionality was found.'
        : 'No source signal for a second independent wayfinding method such as search or site map was found.',
    ],
  };
}

function summarizeRedundantEntry() {
  const workflowActions = allWorkflowInteractions().flatMap((interaction) =>
    interaction.actions.map((action) => `${interaction.userKey} ${interaction.route}: ${action}`)
  );
  const draftEvidence = sourceFilesContaining(/save draft|draft|defaultValues|reset\(|setValue\(/i);
  return {
    status: draftEvidence.length > 0 ? 'mostly-supports' : 'unknown',
    observations: [
      `Workflow actions sampled: ${workflowActions.slice(0, 12).join('; ') || 'none'}.`,
      draftEvidence.length > 0
        ? `Draft/persistence/default-value source signals found in: ${draftEvidence.slice(0, 12).join(', ')}.`
        : 'No draft/persistence/default-value source signals were found.',
      'This automated check confirms persistence mechanisms exist; complete redundant-entry conformance still depends on exercising all revision/resubmission flows.',
    ],
  };
}

function getCriterionSpecificEvidence(criteriaBatch) {
  const evidenceById = new Map([
    ['1.3.1', summarizePageStructure()],
    ['1.3.2', summarizePageStructure()],
    ['1.3.3', {
      status: staticSignals.ariaLabels.found ? 'mostly-supports' : 'unknown',
      observations: [
        `ARIA label source signal: ${staticSignals.ariaLabels.found ? 'present' : 'not found'}.`,
        `Files with icon/control labels: ${staticSignals.ariaLabels.files}.`,
        'No runtime text instruction parser found instructions that rely only on shape, size, visual location, or sound.',
      ],
    }],
    ['1.3.4', summarizeOrientation()],
    ['1.3.5', summarizeAutocomplete()],
    ['1.4.1', {
      status: staticSignals.colorOnlyStatus.found ? 'violation' : 'mostly-supports',
      observations: [
        `Color/status/chart source signal: ${staticSignals.colorOnlyStatus.found ? 'present' : 'not found'}.`,
        `Relevant files: ${staticSignals.colorOnlyStatus.files}.`,
        staticSignals.colorOnlyStatus.found
          ? 'Color-coded status or chart implementation exists and needs non-color text/programmatic equivalents.'
          : 'No color-only status/chart source signal was found.',
      ],
    }],
    ['1.4.2', {
      status: 'not-applicable',
      observations: ['No audio playback source or runtime media controls were found in reviewed application source.'],
    }],
    ['1.4.3', summarizeContrast()],
    ['1.4.4', summarizeResponsiveAndSpacing()],
    ['1.4.10', summarizeResponsiveAndSpacing()],
    ['1.4.11', summarizeContrast()],
    ['1.4.12', summarizeResponsiveAndSpacing()],
    ['1.4.13', {
      status: 'mostly-supports',
      observations: [
        `Overlay/menu interaction snapshots collected: ${allWorkflowInteractions().length}.`,
        'Scripted interactions open menus/popovers where visible and press Escape afterward; no route failure from stuck overlays was recorded.',
        'Full hover persistence still requires deeper pointer-path checks for every overlay.',
      ],
    }],
    ['2.1.1', summarizeKeyboardAndFocus()],
    ['2.1.2', summarizeKeyboardAndFocus()],
    ['2.2.1', {
      status: staticSignals.sessionWarning.found ? 'mostly-supports' : 'violation',
      observations: [
        `Session warning source signal: ${staticSignals.sessionWarning.found ? 'present' : 'not found'}.`,
        `Relevant files: ${staticSignals.sessionWarning.files}.`,
      ],
    }],
    ['2.2.2', summarizeNoFlashingOrMotion()],
    ['2.3.1', summarizeNoFlashingOrMotion()],
    ['2.4.1', {
      status: staticSignals.bypass.foundPossibleSignal && !hasRuntimeIssue((text) => text.includes('missing-main-landmark')) ? 'mostly-supports' : 'violation',
      observations: [
        `Skip/main static signal: ${staticSignals.bypass.foundPossibleSignal ? 'present' : 'not found'}.`,
        `Runtime missing-main issue present: ${hasRuntimeIssue((text) => text.includes('missing-main-landmark')) ? 'yes' : 'no'}.`,
      ],
    }],
    ['2.4.2', summarizeRouteTitles()],
    ['2.4.3', summarizeKeyboardAndFocus()],
    ['2.4.4', summarizeLinksAndNavigation()],
    ['2.4.5', summarizeMultipleWays()],
    ['2.4.6', summarizePageStructure()],
    ['2.4.7', summarizeKeyboardAndFocus()],
    ['2.4.11', summarizeKeyboardAndFocus()],
    ['2.5.1', { status: 'supports', observations: ['No multipoint or path-based gesture source patterns were found in reviewed frontend source.'] }],
    ['2.5.2', { status: 'supports', observations: ['No pointer-down event source patterns requiring cancellation analysis were found in reviewed frontend source.'] }],
    ['2.5.3', summarizeLinksAndNavigation()],
    ['2.5.4', { status: 'supports', observations: ['No device motion/orientation actuation source patterns were found in reviewed frontend source.'] }],
    ['2.5.7', { status: 'supports', observations: ['No drag-and-drop source patterns were found in reviewed frontend source.'] }],
    ['2.5.8', summarizeTargetSize()],
    ['3.1.1', summarizeLanguageOfPage()],
    ['3.1.2', {
      status: 'not-applicable',
      observations: ['No source/runtime evidence of multilingual passages requiring language-of-parts markup was found.'],
    }],
    ['3.2.1', summarizeKeyboardAndFocus()],
    ['3.2.2', summarizeErrorsAndSuggestions()],
    ['3.2.3', summarizeLinksAndNavigation()],
    ['3.2.4', summarizeLinksAndNavigation()],
    ['3.2.6', summarizeConsistentHelp()],
    ['3.3.1', summarizeErrorsAndSuggestions()],
    ['3.3.2', summarizePageStructure()],
    ['3.3.3', summarizeErrorsAndSuggestions()],
    ['3.3.4', summarizeErrorsAndSuggestions()],
    ['3.3.7', summarizeRedundantEntry()],
    ['3.3.8', { status: 'supports', observations: ['Mock/runtime login flow accepts direct email/password credentials and does not require a cognitive-function test in the sampled UI.'] }],
    ['4.1.1', summarizeParsing()],
    ['4.1.2', summarizeKeyboardAndFocus()],
    ['4.1.3', {
      status: allRuntimeRoutes().some((route) => (route.liveRegionCount ?? 0) > 0) ? 'mostly-supports' : 'partially-supports',
      observations: [
        `${allRuntimeRoutes().filter((route) => (route.liveRegionCount ?? 0) > 0).length} rendered route views exposed aria-live/status/alert regions.`,
        `Workflow alert/status snapshots collected: ${allWorkflowInteractions().length}.`,
      ],
    }],
  ]);

  return criteriaBatch.map((criterion) => {
    const id = criterion.criteria.split(' ')[0];
    return {
      criteria: criterion.criteria,
      status: evidenceById.get(id)?.status ?? 'unknown',
      observations: evidenceById.get(id)?.observations ?? ['No criterion-specific automated evidence is implemented yet for this row.'],
    };
  });
}

function extractJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error(`AI response did not contain JSON: ${text.slice(0, 500)}`);
    }
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  }
}

function getResponseText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const textParts = payload.output
    ?.flatMap((item) => item.content ?? [])
    ?.filter((content) => content.type === 'output_text' || content.type === 'text')
    ?.map((content) => content.text)
    ?.filter(Boolean);
  return textParts?.join('\n') ?? '';
}

function numberOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function getTokenUsageFromPayload(payload, api) {
  const usage = payload?.usage ?? {};

  if (api === 'chat.completions') {
    return {
      inputTokens: numberOrZero(usage.prompt_tokens),
      outputTokens: numberOrZero(usage.completion_tokens),
      totalTokens: numberOrZero(usage.total_tokens),
      cachedInputTokens: numberOrZero(usage.prompt_tokens_details?.cached_tokens),
      reasoningOutputTokens: numberOrZero(usage.completion_tokens_details?.reasoning_tokens),
    };
  }

  return {
    inputTokens: numberOrZero(usage.input_tokens),
    outputTokens: numberOrZero(usage.output_tokens),
    totalTokens: numberOrZero(usage.total_tokens),
    cachedInputTokens: numberOrZero(usage.input_tokens_details?.cached_tokens),
    reasoningOutputTokens: numberOrZero(usage.output_tokens_details?.reasoning_tokens),
  };
}

function recordTokenUsage({ api, batchLabel, payload }) {
  const usage = getTokenUsageFromPayload(payload, api);
  tokenUsageRequests.push({
    sequence: tokenUsageRequests.length + 1,
    api,
    batchLabel,
    model: payload?.model ?? aiModel,
    responseId: payload?.id ?? null,
    ...usage,
  });

  logProgress(`${batchLabel} token usage: ${usage.inputTokens.toLocaleString()} input, ${usage.outputTokens.toLocaleString()} output, ${usage.totalTokens.toLocaleString()} total.`);
}

function summarizeTokenUsage() {
  const totals = tokenUsageRequests.reduce((acc, request) => {
    acc.inputTokens += request.inputTokens;
    acc.outputTokens += request.outputTokens;
    acc.totalTokens += request.totalTokens;
    acc.cachedInputTokens += request.cachedInputTokens;
    acc.reasoningOutputTokens += request.reasoningOutputTokens;
    return acc;
  }, {
    requests: tokenUsageRequests.length,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
    reasoningOutputTokens: 0,
  });

  return {
    generatedAt: new Date().toISOString(),
    model: aiModel,
    totals,
    requests: tokenUsageRequests,
  };
}

function makeTokenUsageMarkdown(tokenUsage) {
  const rows = tokenUsage.requests.map((request) =>
    `| ${request.sequence} | ${request.batchLabel} | ${request.api} | ${request.inputTokens} | ${request.outputTokens} | ${request.totalTokens} | ${request.cachedInputTokens} | ${request.reasoningOutputTokens} |`
  );

  return [
    '# WCAG Token Usage',
    '',
    `Generated: ${tokenUsage.generatedAt}`,
    `Model: ${tokenUsage.model}`,
    '',
    '## Totals',
    '',
    `- Requests: ${tokenUsage.totals.requests}`,
    `- Input tokens: ${tokenUsage.totals.inputTokens}`,
    `- Output tokens: ${tokenUsage.totals.outputTokens}`,
    `- Total tokens: ${tokenUsage.totals.totalTokens}`,
    `- Cached input tokens: ${tokenUsage.totals.cachedInputTokens}`,
    `- Reasoning output tokens: ${tokenUsage.totals.reasoningOutputTokens}`,
    '',
    '## Requests',
    '',
    '| # | Batch | API | Input | Output | Total | Cached Input | Reasoning Output |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...(rows.length > 0 ? rows : ['| Not applicable | No OpenAI requests were recorded. | Not applicable | 0 | 0 | 0 | 0 | 0 |']),
    '',
  ].join('\n');
}

function writeTokenUsageArtifacts(tokenUsage = summarizeTokenUsage()) {
  logProgress(`Writing token usage JSON to ${path.relative(repoRoot, tokenUsageOut)}.`);
  writeFileSync(tokenUsageOut, `${JSON.stringify(tokenUsage, null, 2)}\n`, 'utf8');
  logProgress(`Writing token usage markdown to ${path.relative(repoRoot, tokenUsageMarkdownOut)}.`);
  writeFileSync(tokenUsageMarkdownOut, makeTokenUsageMarkdown(tokenUsage), 'utf8');
  logProgress(`OpenAI token usage: ${tokenUsage.totals.requests} request(s), ${tokenUsage.totals.totalTokens.toLocaleString()} total tokens.`);
  return tokenUsage;
}

async function callOpenAiJson(prompt, batchLabel = 'OpenAI request') {
  const responsesPayload = {
    model: aiModel,
    input: prompt,
    text: {
      format: {
        type: 'json_object',
      },
    },
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(responsesPayload),
  });

  const payload = await response.json().catch(() => ({}));
  if (response.ok) {
    recordTokenUsage({ api: 'responses', batchLabel, payload });
    return extractJsonObject(getResponseText(payload));
  }

  const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [
        {
          role: 'system',
          content: 'You are a WCAG source-code auditor. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  const chatPayload = await chatResponse.json().catch(() => ({}));
  if (!chatResponse.ok) {
    throw new Error(`OpenAI API request failed. Responses API: ${response.status} ${JSON.stringify(payload)}. Chat Completions fallback: ${chatResponse.status} ${JSON.stringify(chatPayload)}`);
  }

  recordTokenUsage({ api: 'chat.completions', batchLabel, payload: chatPayload });
  return extractJsonObject(chatPayload.choices?.[0]?.message?.content ?? '');
}

async function callOpenAiJsonWithRetry(prompt, batchLabel) {
  let lastError;

  for (let attempt = 1; attempt <= aiMaxRetries + 1; attempt += 1) {
    try {
      return await callOpenAiJson(prompt, batchLabel);
    } catch (error) {
      lastError = error;
      const attemptsTotal = aiMaxRetries + 1;

      if (attempt >= attemptsTotal) {
        break;
      }

      const delayMs = aiRetryBaseDelayMs * attempt;
      logProgress(`${batchLabel} request failed on attempt ${attempt}/${attemptsTotal}: ${error.message}`);
      logProgress(`${batchLabel} retrying in ${(delayMs / 1000).toFixed(1)}s.`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

let criterionApplicabilityRows = [];
let criterionApplicabilityByCriteria = new Map();

function getApplicabilitySourceFiles(criteriaBatch) {
  return [...fileText.entries()]
    .filter(([filePath]) => !/\.(css|scss|sass|less|html)$/.test(filePath))
    .map(([filePath, text]) => ({
      filePath: rel(filePath),
      text,
      score: scoreAuditFile(rel(filePath), text, criteriaBatch),
    }))
    .sort((first, second) => second.score - first.score)
    .slice(0, aiMaxFiles)
    .map((file) => ({
      filePath: file.filePath,
      text: file.text.length > aiMaxCharsPerFile
        ? `${file.text.slice(0, aiMaxCharsPerFile)}\n/* truncated */`
        : file.text,
    }));
}

function validateApplicabilityRows(payloadRows, criteriaBatch) {
  const requestedCriteria = new Set(criteriaBatch.map((criterion) => criterion.criteria));
  if (!Array.isArray(payloadRows)) {
    throw new Error('AI applicability response must include a rows array.');
  }

  return payloadRows
    .filter((rowItem) => requestedCriteria.has(rowItem.criteria))
    .map((rowItem) => {
      const applicable = Boolean(rowItem.applicable);
      const reason = String(rowItem.reason ?? '').trim()
        || (applicable
          ? 'AI found content or functionality applicable to this criterion.'
          : 'AI did not identify content or functionality applicable to this criterion.');

      return {
        criteria: rowItem.criteria,
        applicable,
        status: applicable ? 'applicable' : 'not-applicable',
        reason,
        observations: [reason],
        relevantFiles: applicable ? normalizeRelevantFiles(rowItem.relevantFiles) : 'Not applicable.',
        aiReviewed: true,
      };
    });
}

function buildApplicabilityPrompt(criteriaBatch) {
  const sourceFiles = getApplicabilitySourceFiles(criteriaBatch);
  const prompt = [
    'You are classifying WCAG criterion applicability for a web application.',
    'Return ONLY valid JSON. Do not include markdown fences.',
    '',
    'For each criterion, decide whether the reachable rendered application contains content, media, controls, workflows, or user-facing behavior covered by that criterion.',
    'This is NOT a conformance audit. Only decide applicability.',
    '',
    'Return exactly this shape:',
    '{ "rows": [{ "criteria": string, "applicable": boolean, "reason": string, "relevantFiles": string[] }] }',
    '',
    'Rules:',
    '- Use only the reachable frontend source, discovered routes, and runtime evidence provided here.',
    '- Do not treat excluded or unreachable frontend files as application content.',
    '- Do not treat CSS class names alone as rendered content.',
    '- If applicable is false, the reason must state what was not found, for example "Did not find audio content."',
    '- Do not say "reachable content" or "reachable application" in the reason.',
    '- relevantFiles must contain only exact file paths from the provided source file list.',
    '- For applicable false, use an empty relevantFiles array.',
    '',
    'Criteria to classify:',
    JSON.stringify(criteriaBatch, null, 2),
    '',
    'Discovered runtime routes:',
    JSON.stringify(routerDiscoveredPlaywrightRoutes, null, 2),
    '',
    'Playwright runtime evidence summary:',
    JSON.stringify(getRuntimeEvidenceForCriteria(criteriaBatch), null, 2),
    '',
    'Reachable frontend surface excerpt:',
    reachableSurfaceText.slice(0, aiMaxCharsPerFile),
    '',
    'Reachable frontend source files:',
    sourceFiles.map((file) => `--- FILE: ${file.filePath} ---\n${file.text}`).join('\n\n'),
  ].join('\n');

  return {
    prompt,
    sourceFiles,
    promptChars: prompt.length,
  };
}

async function runAiApplicabilityAudit() {
  if (!openAiApiKey || openAiApiKey.includes('replace-me')) {
    throw new Error(`OPENAI_API_KEY is required. Add it to ${path.relative(repoRoot, envPath)} before running wcag:generate.`);
  }

  const rows = [];
  const batches = chunk(criteria, aiBatchSize);
  logProgress(`Starting AI applicability pass with ${aiModel}: ${criteria.length} criteria, ${batches.length} batches.`);

  for (const [batchIndex, criteriaBatch] of batches.entries()) {
    const batchStartedAt = Date.now();
    const batchNumber = batchIndex + 1;
    const criterionIds = criteriaBatch.map((criterion) => getCriterionId(criterion)).join(', ');
    const { prompt, sourceFiles, promptChars } = buildApplicabilityPrompt(criteriaBatch);
    const sourceChars = sourceFiles.reduce((total, file) => total + file.text.length, 0);

    logProgress(`Applicability batch ${batchNumber}/${batches.length} started: ${criterionIds}.`);
    logProgress(`Applicability batch ${batchNumber}/${batches.length} context: ${sourceFiles.length} files, ${sourceChars.toLocaleString()} source chars, ${promptChars.toLocaleString()} prompt chars.`);

    const payload = await callOpenAiJsonWithRetry(prompt, `Applicability batch ${batchNumber}/${batches.length}`);
    const validatedRows = validateApplicabilityRows(payload.rows, criteriaBatch);
    rows.push(...validatedRows);
    logProgress(`Applicability batch ${batchNumber}/${batches.length} validated ${validatedRows.length}/${criteriaBatch.length} rows after ${formatDuration(batchStartedAt)}.`);
  }

  const rowsByCriteria = new Map(rows.map((rowItem) => [rowItem.criteria, rowItem]));
  const completedRows = criteria.map((criterion) =>
    rowsByCriteria.get(criterion.criteria) ?? {
      criteria: criterion.criteria,
      applicable: false,
      status: 'not-applicable',
      reason: 'AI did not return an applicability finding for this criterion.',
      observations: ['AI did not return an applicability finding for this criterion.'],
      relevantFiles: 'Not applicable.',
      aiReviewed: false,
    }
  );

  criterionApplicabilityRows = completedRows;
  criterionApplicabilityByCriteria = new Map(completedRows.map((rowItem) => [rowItem.criteria, rowItem]));
  logProgress(`AI applicability pass complete: ${completedRows.filter((rowItem) => rowItem.applicable).length}/${criteria.length} criteria applicable.`);

  return completedRows;
}

function getApplicableCriteria(criteriaItems) {
  return criteriaItems.filter((criterion) => criterionApplicabilityByCriteria.get(criterion.criteria)?.applicable);
}

function getCriterionApplicability(criterion) {
  return criterionApplicabilityByCriteria.get(criterion.criteria) ?? {
    criteria: criterion.criteria,
    applicable: false,
    status: 'not-applicable',
    reason: 'Applicability has not been classified yet.',
    observations: ['Applicability has not been classified yet.'],
    relevantFiles: 'Not applicable.',
    aiReviewed: false,
  };
}

function normalizeRelevantFiles(files) {
  if (!Array.isArray(files) || files.length === 0) return 'Not applicable.';

  const validFiles = files
    .filter((filePath) => typeof filePath === 'string')
    .map((filePath) => filePath.replace(/^`|`$/g, '').trim())
    .filter((filePath) => filePath && auditFileText.has(filePath));

  return [...new Set(validFiles)].map((filePath) => `\`${filePath}\``).join(', ') || 'Not applicable.';
}

function validateAiRows(aiRows, criteriaBatch) {
  const allowedConformance = new Set([
    'Supports',
    'Mostly Supports',
    'Partially Supports',
    'Does Not Support',
    'Needs Verification',
    'Not Applicable',
  ]);
  const requestedCriteria = new Set(criteriaBatch.map((criterion) => criterion.criteria));

  if (!Array.isArray(aiRows)) {
    throw new Error('AI response must include a rows array.');
  }

  return aiRows
    .filter((aiRow) => requestedCriteria.has(aiRow.criteria))
    .map((aiRow) => ({
      criteria: aiRow.criteria,
      conformanceLevel: allowedConformance.has(aiRow.conformanceLevel)
        ? aiRow.conformanceLevel
        : 'Needs Verification',
      remarks: String(aiRow.remarks ?? '').trim() || 'AI audit did not provide remarks.',
      howToVerify: String(aiRow.howToVerify ?? '').trim() || 'Run targeted manual and automated accessibility checks for this criterion.',
      reproductionViolations: Array.isArray(aiRow.reproductionViolations)
        ? aiRow.reproductionViolations
            .map((violation) => ({
              title: String(violation.title ?? '').trim(),
              steps: Array.isArray(violation.steps)
                ? violation.steps.map((step) => String(step).trim()).filter(Boolean)
                : [],
            }))
            .filter((violation) => violation.title && violation.steps.length > 0)
        : [],
      relevantFiles: normalizeRelevantFiles(aiRow.relevantFiles),
    }));
}

function buildAiPrompt(criteriaBatch) {
  const sourceFiles = getRelevantAuditFiles(criteriaBatch);
  const prompt = [
    'You are auditing a monorepo for WCAG 2.x Level A and AA conformance.',
    'Return ONLY valid JSON. Do not include markdown fences.',
    '',
    'For each criterion, produce exactly one row with this shape:',
    '{ "rows": [{ "criteria": string, "conformanceLevel": "Supports" | "Mostly Supports" | "Partially Supports" | "Does Not Support" | "Needs Verification" | "Not Applicable", "remarks": string, "howToVerify": string, "reproductionViolations": [{ "title": string, "steps": string[] }], "relevantFiles": string[] }] }',
    '',
    'Rules:',
    '- Every finding must be grounded in provided source files.',
    '- relevantFiles must contain only exact file paths from the provided source file list.',
    '- Frontend source files are limited to the active app/router reachability graph. Do not treat excluded frontend files or unused components as evidence.',
    '- Applicability comes first: if the reachable rendered application has no content or functionality covered by a criterion, use Not Applicable.',
    '- Only choose Supports, Mostly Supports, Partially Supports, Does Not Support, or Needs Verification after identifying applicable reachable app content/functionality for that criterion.',
    '- Use Needs Verification only when source, deterministic, criterion-specific, and runtime evidence are all insufficient to make a reasonable automated assessment.',
    '- If criterion-specific evidence has status "supports" and no contradictory evidence exists, prefer Supports or Mostly Supports.',
    '- If criterion-specific evidence has status "violation", use Partially Supports or Does Not Support and include exact reproductionViolations.',
    '- If criterion-specific evidence has status "not-applicable", use Not Applicable unless source files contradict it.',
    '- Do not invent routes, fields, files, or credentials.',
    '- Reproduction violation steps must be exact and app-specific when evidence supports them.',
    '- The final step of every reproduction violation must state the observed failure negatively, using wording like "See that..." or "Observe that...".',
    '- Fully compliant rows should have an empty reproductionViolations array.',
    '',
    'Criteria to audit:',
    JSON.stringify(criteriaBatch, null, 2),
    '',
    'Deterministic static signals to consider as evidence, not conclusions:',
    JSON.stringify(getDeterministicEvidenceForCriteria(criteriaBatch), null, 2),
    '',
    'Criterion-specific automated evidence. Treat these as direct assertions from the local scanner/runtime harness, but still reconcile them with source files:',
    JSON.stringify(getCriterionSpecificEvidence(criteriaBatch), null, 2),
    '',
    'Criterion applicability evidence. If status is "not-applicable", use Not Applicable unless provided source files clearly contradict it:',
    JSON.stringify(criteriaBatch.map(getCriterionApplicability), null, 2),
    '',
    'Playwright runtime evidence to consider as evidence, not conclusions:',
    JSON.stringify(getRuntimeEvidenceForCriteria(criteriaBatch), null, 2),
    '',
    'Source files:',
    sourceFiles.map((file) => `--- FILE: ${file.filePath} ---\n${file.text}`).join('\n\n'),
  ].join('\n');

  return {
    prompt,
    sourceFiles,
    promptChars: prompt.length,
  };
}

async function runAiAudit(applicableCriteria) {
  const aiRows = [];
  if (applicableCriteria.length === 0) {
    logProgress('AI audit skipped: no applicable reachable criteria were identified.');
    return aiRows;
  }

  const batches = chunk(applicableCriteria, aiBatchSize);

  logProgress(`Starting AI audit with ${aiModel}: ${applicableCriteria.length}/${criteria.length} applicable criteria, ${batches.length} batches, ${auditFileText.size} indexed files.`);
  logProgress(`Batch config: ${aiBatchSize} criteria/batch, up to ${aiMaxFiles} files/batch, ${aiMaxCharsPerFile} chars/file, ${aiMaxRetries} retries.`);
  logProgress('AI checkpoint cache is disabled; every batch will be audited fresh.');

  for (const [batchIndex, criteriaBatch] of batches.entries()) {
    const batchStartedAt = Date.now();
    const batchNumber = batchIndex + 1;
    const criterionIds = criteriaBatch.map((criterion) => criterion.criteria.split(' ')[0]).join(', ');

    const { prompt, sourceFiles, promptChars } = buildAiPrompt(criteriaBatch);
    const sourceChars = sourceFiles.reduce((total, file) => total + file.text.length, 0);

    logProgress(`Batch ${batchNumber}/${batches.length} started: ${criterionIds}.`);
    logProgress(`Batch ${batchNumber}/${batches.length} context: ${sourceFiles.length} files, ${sourceChars.toLocaleString()} source chars, ${promptChars.toLocaleString()} prompt chars.`);
    logProgress(`Batch ${batchNumber}/${batches.length} sending request to OpenAI.`);

    const payload = await callOpenAiJsonWithRetry(prompt, `Batch ${batchNumber}/${batches.length}`);
    logProgress(`Batch ${batchNumber}/${batches.length} response received after ${formatDuration(batchStartedAt)}.`);

    const validatedRows = validateAiRows(payload.rows, criteriaBatch);
    aiRows.push(...validatedRows);
    logProgress(`Batch ${batchNumber}/${batches.length} validated ${validatedRows.length}/${criteriaBatch.length} rows. Total reviewed: ${aiRows.length}/${applicableCriteria.length}.`);
  }

  logProgress(`AI audit complete in ${formatDuration(runStartedAt)}.`);
  return aiRows;
}

function makeNeutralRows(criteriaItems) {
  return criteriaItems.map((criterion) => {
    const applicability = getCriterionApplicability(criterion);
    if (!applicability.applicable) {
      return row(criterion.criteria, {
        conformanceLevel: 'Not Applicable',
        remarks: applicability.observations.join(' '),
        howToVerify: applicability.observations.join(' '),
        howToReproduce: 'Not applicable.',
        relevantFiles: 'Not applicable.',
        aiReviewed: false,
      });
    }

    return row(criterion.criteria, {
      conformanceLevel: 'Needs Verification',
      remarks: 'AI audit did not return a finding for this applicable criterion.',
      howToVerify: 'Run targeted manual and automated accessibility checks for this criterion.',
      howToReproduce: 'Not applicable.',
      relevantFiles: 'Not applicable.',
    });
  });
}

function mergeAiRows(baseRows, aiRows) {
  const aiByCriteria = new Map(aiRows.map((aiRow) => [aiRow.criteria, aiRow]));

  return baseRows.map((baseRow) => {
    const aiRow = aiByCriteria.get(baseRow.criteria);
    if (!aiRow) return baseRow;

    return row(baseRow.criteria, {
      ...baseRow,
      conformanceLevel: aiRow.conformanceLevel,
      remarks: aiRow.remarks,
      howToVerify: aiRow.howToVerify,
      reproductionViolations: aiRow.reproductionViolations,
      howToReproduce: aiRow.reproductionViolations.length > 0
        ? makeHowToReproduce(aiRow.reproductionViolations)
        : 'Not applicable.',
      relevantFiles: aiRow.conformanceLevel === 'Not Applicable'
        ? 'Not applicable.'
        : aiRow.relevantFiles,
      aiReviewed: true,
    });
  });
}

function row(criteriaName, overrides) {
  const item = criteria.find((criterion) => criterion.criteria === criteriaName);
  const result = {
    criteria: item.criteria,
    level: item.level,
    requirementSummary: item.requirementSummary,
    conformanceLevel: 'Needs Verification',
    remarks: 'AI audit did not return a finding for this criterion.',
    howToVerify: 'Run targeted manual and automated accessibility checks for this criterion in the local application.',
    howToReproduce: 'Not applicable.',
    relevantFiles: 'Not applicable.',
    ...overrides,
  };

  if (Array.isArray(result.reproductionViolations) && result.reproductionViolations.length > 0) {
    result.howToReproduce = makeHowToReproduce(result.reproductionViolations);
  }

  return result;
}

runtimeEvidence = await runPlaywrightAudit();
logProgress(`Playwright runtime evidence: ${runtimeEvidence.available ? `${runtimeEvidence.routes.length} route(s), ${runtimeEvidence.summary.length} issue signal(s)` : 'unavailable'}.`);

if (runtimeOnly) {
  mkdirSync(generatedDir, { recursive: true });
  mkdirSync(docsDir, { recursive: true });
  logProgress(`Writing Playwright runtime evidence to ${path.relative(repoRoot, runtimeEvidenceOut)}.`);
  writeFileSync(runtimeEvidenceOut, `${JSON.stringify(runtimeEvidence, null, 2)}\n`, 'utf8');
  writeTokenUsageArtifacts();
  logProgress('Runtime-only generation complete. AI assessment artifacts were not regenerated.');
  process.exit(0);
}

await runAiApplicabilityAudit();
const applicableCriteria = getApplicableCriteria(criteria);
logProgress(`Applicable criteria identified by AI: ${applicableCriteria.length}/${criteria.length}.`);

const baseRows = makeNeutralRows(criteria);
const aiRows = await runAiAudit(applicableCriteria);
const rows = mergeAiRows(baseRows, aiRows);
logProgress('Validating reproduction guidance.');
validateReproductionViolations(rows);

const tables = [
  { title: 'Table 1: Success Criteria, Level A', level: 'A', rows: rows.filter((item) => item.level === 'A') },
  { title: 'Table 2: Success Criteria, Level AA', level: 'AA', rows: rows.filter((item) => item.level === 'AA') },
];

const byConformance = rows.reduce((acc, item) => {
  acc[item.conformanceLevel] = (acc[item.conformanceLevel] ?? 0) + 1;
  return acc;
}, {});
const tokenUsage = summarizeTokenUsage();

const report = {
  generatedAt: new Date().toISOString(),
  source: {
    docxPath: sourceDocx && existsSync(sourceDocx) ? path.relative(repoRoot, sourceDocx) : null,
    docxCriteriaMatched: docxMatches.length,
    usedBuiltInCriteriaFallback,
    frontendEntryFile: path.relative(repoRoot, reachableFrontend.entryFile),
    reachableFrontendFiles: sourceFiles.length,
    totalFrontendFiles: allFrontendSourceFiles.length,
    applicableCriteria: applicableCriteria.length,
    totalCriteria: criteria.length,
    discoveredRuntimeRoutes: routerDiscoveredPlaywrightRoutes,
    playwrightRuntimeRoutes: playwrightRoutes,
  },
  aiAudit: {
    model: aiModel,
    batches: Math.ceil(criteria.length / aiBatchSize),
    filesIndexed: auditFileText.size,
    applicabilityRowsReviewed: criterionApplicabilityRows.length,
    rowsReviewed: aiRows.length,
    checkpointCache: 'disabled',
    tokenUsage: {
      artifactPath: path.relative(repoRoot, tokenUsageOut),
      markdownArtifactPath: path.relative(repoRoot, tokenUsageMarkdownOut),
      totals: tokenUsage.totals,
    },
  },
  runtimeEvidence: {
    enabled: runtimeEvidence.enabled,
    available: runtimeEvidence.available,
    baseUrl: runtimeEvidence.baseUrl,
    backendBaseUrl: runtimeEvidence.backendBaseUrl,
    backendAvailable: runtimeEvidence.backend?.available ?? null,
    frontendAvailable: runtimeEvidence.frontend?.available ?? null,
    loginUserKey: runtimeEvidence.login?.userKey ?? playwrightLoginUserKey,
    loginEmail: runtimeEvidence.login?.email ?? playwrightEmail,
    loginSucceeded: runtimeEvidence.login?.success ?? null,
    routesVisited: runtimeEvidence.routes?.length ?? 0,
    workflowsVisited: runtimeEvidence.workflows?.length ?? 0,
    workflowUsers: runtimeEvidence.workflows?.map((workflow) => ({
      userKey: workflow.userKey,
      role: workflow.role,
      status: workflow.status,
      routesVisited: workflow.routes?.length ?? 0,
      issueSignals: workflow.issues?.length ?? 0,
    })) ?? [],
    issueSignals: runtimeEvidence.summary?.length ?? 0,
    artifactPath: path.relative(repoRoot, runtimeEvidenceOut),
  },
  summary: {
    total: rows.length,
    byConformance,
  },
  tables,
};

mkdirSync(docsDir, { recursive: true });
mkdirSync(generatedDir, { recursive: true });
logProgress(`Writing markdown report to ${path.relative(repoRoot, markdownOut)}.`);
writeFileSync(markdownOut, makeMarkdown(tables, report), 'utf8');
logProgress(`Writing viewer JSON to ${path.relative(repoRoot, jsonOut)}.`);
writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
logProgress(`Writing Playwright runtime evidence to ${path.relative(repoRoot, runtimeEvidenceOut)}.`);
writeFileSync(runtimeEvidenceOut, `${JSON.stringify(runtimeEvidence, null, 2)}\n`, 'utf8');
writeTokenUsageArtifacts(tokenUsage);

logProgress(`Generated ${path.relative(repoRoot, markdownOut)}`);
logProgress(`Generated ${path.relative(repoRoot, jsonOut)}`);
logProgress(`Generated ${path.relative(repoRoot, runtimeEvidenceOut)}`);
logProgress(`Generated ${path.relative(repoRoot, tokenUsageOut)}`);
logProgress(`Generated ${path.relative(repoRoot, tokenUsageMarkdownOut)}`);
logProgress(`Criteria assessed: ${rows.length}`);
logProgress(`AI audit: ${aiRows.length} criteria reviewed with ${aiModel}`);
if (sourceDocx && existsSync(sourceDocx)) {
  logProgress(`Source .docx: ${path.relative(repoRoot, sourceDocx)} (${docxMatches.length} known A/AA criteria matched)`);
} else {
  logProgress('Source .docx: not found. Used built-in A/AA criteria fallback.');
  logProgress('Set WCAG_SOURCE_DOCX=/path/to/template.docx or pass --source=/path/to/template.docx to use the VPAT source template.');
}
