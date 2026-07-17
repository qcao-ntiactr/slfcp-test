import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '../..');
const envPath = path.join(appDir, '.env');
const sourceDocx = path.join(repoRoot, 'docs/wcag-source.docx');
const generatedDir = path.join(appDir, 'src/generated');
const assessmentPath = path.join(generatedDir, 'wcagAssessment.json');
const runtimeEvidencePath = path.join(generatedDir, 'wcagRuntimeEvidence.json');

function loadEnv(filePath) {
  const values = {};
  if (!existsSync(filePath)) return values;

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    values[key.trim()] = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
  }

  return values;
}

function checkUrl(url) {
  return fetch(url, { signal: AbortSignal.timeout(2500) })
    .then((response) => ({ ok: response.ok, status: response.status }))
    .catch((error) => ({ ok: false, error: error.message }));
}

function log(status, label, detail = '') {
  const marker = {
    pass: 'PASS',
    warn: 'WARN',
    fail: 'FAIL',
  }[status];
  console.log(`[${marker}] ${label}${detail ? ` - ${detail}` : ''}`);
}

const env = {
  ...loadEnv(envPath),
  ...process.env,
};
const failures = [];
const warnings = [];

if (existsSync(envPath)) log('pass', '.env exists', path.relative(repoRoot, envPath));
else {
  warnings.push('.env is missing');
  log('warn', '.env missing', 'copy apps/wcag-compliance-viewer/.env.example');
}

if (env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('replace-me')) log('pass', 'OPENAI_API_KEY is configured');
else {
  failures.push('OPENAI_API_KEY is missing or still replace-me');
  log('fail', 'OPENAI_API_KEY missing', 'required for pnpm wcag:generate');
}

if (existsSync(sourceDocx)) log('pass', 'WCAG source doc exists', path.relative(repoRoot, sourceDocx));
else {
  failures.push('docs/wcag-source.docx is missing');
  log('fail', 'WCAG source doc missing', 'expected docs/wcag-source.docx');
}

if (existsSync(generatedDir)) log('pass', 'Generated directory exists', path.relative(repoRoot, generatedDir));
else {
  warnings.push('generated directory is missing');
  log('warn', 'Generated directory missing', 'run pnpm wcag:generate');
}

for (const artifactPath of [assessmentPath, runtimeEvidencePath]) {
  if (existsSync(artifactPath)) log('pass', 'Artifact exists', path.relative(repoRoot, artifactPath));
  else log('warn', 'Artifact missing', path.relative(repoRoot, artifactPath));
}

try {
  const playwright = await import('playwright');
  const chromiumPath = playwright.chromium.executablePath();
  if (existsSync(chromiumPath)) log('pass', 'Playwright Chromium installed', chromiumPath);
  else {
    warnings.push('Playwright Chromium executable was not found');
    log('warn', 'Playwright Chromium missing', 'run pnpm wcag:playwright:install');
  }
} catch (error) {
  warnings.push('Playwright import failed');
  log('warn', 'Playwright unavailable', error.message);
}

if (env.WCAG_PLAYWRIGHT_ENABLED !== 'false') {
  const frontendUrl = env.WCAG_PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
  const backendUrl = env.WCAG_PLAYWRIGHT_BACKEND_BASE_URL ?? env.VITE_API_URL ?? 'http://localhost:3000';
  const frontend = await checkUrl(frontendUrl);
  const backend = await checkUrl(backendUrl);

  if (frontend.ok) log('pass', 'Frontend reachable', `${frontendUrl} (${frontend.status})`);
  else if (env.WCAG_PLAYWRIGHT_AUTOSTART_FRONTEND !== 'false') log('warn', 'Frontend not currently reachable', `${frontendUrl}; autostart is enabled`);
  else {
    warnings.push('Frontend is not reachable and autostart is disabled');
    log('warn', 'Frontend not reachable', frontend.error ?? frontendUrl);
  }

  if (backend.ok) log('pass', 'Backend reachable', `${backendUrl} (${backend.status})`);
  else if (env.WCAG_PLAYWRIGHT_AUTOSTART_BACKEND !== 'false') log('warn', 'Backend not currently reachable', `${backendUrl}; autostart is enabled`);
  else {
    warnings.push('Backend is not reachable and autostart is disabled');
    log('warn', 'Backend not reachable', backend.error ?? backendUrl);
  }
} else {
  log('warn', 'Playwright runtime evidence disabled', 'WCAG_PLAYWRIGHT_ENABLED=false');
}

console.log('');
console.log(`Doctor complete: ${failures.length} failure(s), ${warnings.length} warning(s).`);

if (failures.length > 0) {
  process.exit(1);
}
