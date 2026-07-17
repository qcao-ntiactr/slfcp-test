import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function loadLocalEnv(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (!key || process.env[key]) continue;

    const rawValue = valueParts.join('=').trim();
    process.env[key.trim()] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

const frontendRoles = {
  federal: 'Federal',
  commercial: 'Commercial',
  ntia: 'NTIA',
};

const defaultPlaywrightLogins = {
  federal_navy: user('federal@navy.gov', 'Tom Nickelson', frontendRoles.federal, 'Federal NAVY read/write user', {
    federalAgencyId: 3,
    federalAgencyAbbr: 'NAVY',
    canConcur: true,
    isEntityActive: true,
  }),
  federal_nasa: user('federal@nasa.gov', 'Andrew Johnson', frontendRoles.federal, 'Federal NASA read/write user', {
    federalAgencyId: 2,
    federalAgencyAbbr: 'NASA',
    canConcur: true,
  }),
  commercial_qa: user('commercial@qa.com', 'Thomas Jefferson', frontendRoles.commercial, 'Commercial QA user', {
    id: 'commercialqa@company.com',
  }),
  commercial_dev: user('commercial@dev.com', 'Thomas Jefferson', frontendRoles.commercial, 'Commercial dev user', {
    id: 'commercialdev@company.com',
  }),
  ntia_qa: user('ntia@qa.com', 'Benjamin Harrison', frontendRoles.ntia, 'NTIA QA user', {
    id: 'ntiaqa@company.com',
  }),
  ntia_dev: user('ntia@dev.com', 'Benjamin Harrison', frontendRoles.ntia, 'NTIA dev user', {
    id: 'ntiadev@company.com',
  }),
  spacex_user: user('spacex@fakeserver123.com', 'SpaceX User', frontendRoles.commercial, 'SpaceX commercial user'),
  sqa_commercial_spacetesting: user(
    'spacetesting@outlook.com',
    'Dummy Commercial Entity Name',
    frontendRoles.commercial,
    'SQA commercial test user'
  ),
  sqa_federal_pshah_rw: user('pshah@ctec-corp.com', 'P Shah - Federal Agency Read/Write Access (NASA)', frontendRoles.federal, 'SQA federal NASA read/write user', {
    federalAgencyId: 2,
    federalAgencyAbbr: 'NASA',
    canConcur: true,
  }),
  sqa_federal_kbvreddy_comment: user('kbvreddy@yahoo.com', 'KB VReddy - Federal Agency Comment Only (NASA)', frontendRoles.federal, 'SQA federal NASA comment-only user', {
    federalAgencyId: 2,
    federalAgencyAbbr: 'NASA',
    canConcur: false,
  }),
  sqa_federal_vkchitty_admin: user('vkchitty.ctr@ntia.gov', 'VK Chitty - Federal Agency Admin Access (NAVY)', frontendRoles.federal, 'SQA federal NAVY admin user', {
    federalAgencyId: 3,
    federalAgencyAbbr: 'NAVY',
    canConcur: true,
    isEntityActive: true,
  }),
  sqa_ntia_pshah_rw: user('pshah.ctr@ntia.gov', 'P Shah - NTIA User Read/Write Access', frontendRoles.ntia, 'SQA NTIA read/write user'),
};

function user(email, displayName, role, label, overrides = {}) {
  return {
    id: email,
    displayName,
    email,
    password: 'password123',
    role,
    label,
    ...overrides,
  };
}

function readCsvEnv(name, fallback) {
  return (process.env[name] ?? fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toLoginEnvPrefix(key) {
  return `WCAG_PLAYWRIGHT_LOGIN_${key.toUpperCase()}_`;
}

function readPlaywrightLogins() {
  return Object.fromEntries(
    Object.entries(defaultPlaywrightLogins).map(([key, login]) => {
      const prefix = toLoginEnvPrefix(key);
      return [key, {
        ...login,
        email: process.env[`${prefix}EMAIL`] ?? login.email,
        password: process.env[`${prefix}PASSWORD`] ?? login.password,
      }];
    })
  );
}

function resolveSourceDocx({ explicitSource, docsDir, repoRoot }) {
  if (explicitSource && path.extname(explicitSource).toLowerCase() !== '.docx') {
    throw new Error(`WCAG source must be a .docx file, received: ${explicitSource}`);
  }

  return explicitSource
    ?? [
      path.join(docsDir, 'wcag-source.docx'),
      path.join(docsDir, 'VPAT2.5Rev_WCAG_February2025_Draft.docx'),
      path.join(repoRoot, 'VPAT2.5Rev_WCAG_February2025_Draft.docx'),
    ].find((candidate) => existsSync(candidate))
    ?? null;
}

export function createGenerationConfig(scriptUrl) {
  const scriptDir = path.dirname(fileURLToPath(scriptUrl));
  const appDir = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(appDir, '../..');
  const frontendDir = path.join(repoRoot, 'apps/frontend');
  const backendDir = path.join(repoRoot, 'apps/backend');
  const devEnvDir = path.join(repoRoot, 'apps/dev-env');
  const docsDir = path.join(repoRoot, 'docs');
  const generatedDir = path.join(appDir, 'src/generated');
  const envPath = path.join(appDir, '.env');
  const cliArgs = process.argv.slice(2);
  const sourceArg = cliArgs.find((arg) => arg.startsWith('--source='));
  const explicitSource = sourceArg?.slice('--source='.length) ?? process.env.WCAG_SOURCE_DOCX;

  loadLocalEnv(envPath);

  const playwrightLoginUsers = readPlaywrightLogins();
  const playwrightLoginUserKey = process.env.WCAG_PLAYWRIGHT_LOGIN_USER ?? 'ntia_dev';
  const selectedPlaywrightLogin = playwrightLoginUsers[playwrightLoginUserKey] ?? playwrightLoginUsers.ntia_dev;

  return {
    appDir,
    repoRoot,
    frontendDir,
    backendDir,
    devEnvDir,
    docsDir,
    generatedDir,
    markdownOut: path.join(docsDir, 'wcag-a-aa-conformance-assessment.md'),
    jsonOut: path.join(generatedDir, 'wcagAssessment.json'),
    runtimeEvidenceOut: path.join(generatedDir, 'wcagRuntimeEvidence.json'),
    envPath,
    cliArgs,
    runtimeOnly: cliArgs.includes('--runtime-only'),
    openAiApiKey: process.env.OPENAI_API_KEY,
    aiModel: process.env.WCAG_AI_MODEL ?? 'gpt-5',
    aiBatchSize: Number(process.env.WCAG_AI_BATCH_SIZE ?? 4),
    aiMaxFiles: Number(process.env.WCAG_AI_MAX_FILES ?? 18),
    aiMaxCharsPerFile: Number(process.env.WCAG_AI_MAX_CHARS_PER_FILE ?? 12000),
    aiMaxRetries: Number(process.env.WCAG_AI_MAX_RETRIES ?? 3),
    aiRetryBaseDelayMs: Number(process.env.WCAG_AI_RETRY_BASE_DELAY_MS ?? 5000),
    frontendRoles,
    playwrightEnabled: process.env.WCAG_PLAYWRIGHT_ENABLED !== 'false',
    playwrightBaseUrl: process.env.WCAG_PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    playwrightBackendBaseUrl: process.env.WCAG_PLAYWRIGHT_BACKEND_BASE_URL ?? process.env.VITE_API_URL ?? 'http://localhost:3000',
    playwrightForceMockAuth: process.env.WCAG_PLAYWRIGHT_FORCE_MOCK_AUTH !== 'false',
    playwrightLoginUsers,
    playwrightLoginUserKey,
    selectedPlaywrightLogin,
    playwrightEmail: process.env.WCAG_PLAYWRIGHT_EMAIL ?? selectedPlaywrightLogin.email,
    playwrightPassword: process.env.WCAG_PLAYWRIGHT_PASSWORD ?? selectedPlaywrightLogin.password,
    playwrightRoutesFromEnv: process.env.WCAG_PLAYWRIGHT_ROUTES,
    playwrightRoutes: readCsvEnv('WCAG_PLAYWRIGHT_ROUTES', ''),
    playwrightWorkflowEnabled: process.env.WCAG_PLAYWRIGHT_WORKFLOWS_ENABLED !== 'false',
    playwrightWorkflowUserKeys: readCsvEnv('WCAG_PLAYWRIGHT_WORKFLOW_USERS', 'ntia_dev,commercial_dev,federal_navy')
      .filter((userKey) => playwrightLoginUsers[userKey]),
    playwrightMaxTabs: Number(process.env.WCAG_PLAYWRIGHT_MAX_TABS ?? 25),
    playwrightAutoStartFrontend: process.env.WCAG_PLAYWRIGHT_AUTOSTART_FRONTEND !== 'false',
    playwrightFrontendStartupTimeoutMs: Number(process.env.WCAG_PLAYWRIGHT_FRONTEND_STARTUP_TIMEOUT_MS ?? 60000),
    playwrightAutoStartBackend: process.env.WCAG_PLAYWRIGHT_AUTOSTART_BACKEND !== 'false',
    playwrightPrepareDevEnv: process.env.WCAG_PLAYWRIGHT_PREPARE_DEV_ENV !== 'false',
    playwrightSeedBackend: process.env.WCAG_PLAYWRIGHT_SEED_BACKEND === 'true',
    playwrightBackendStartupTimeoutMs: Number(process.env.WCAG_PLAYWRIGHT_BACKEND_STARTUP_TIMEOUT_MS ?? 90000),
    playwrightBackendSeedInput: process.env.WCAG_PLAYWRIGHT_BACKEND_SEED_INPUT ?? 'I\nD\nA\n10\nH\n10\nJ\n5\nK\nQ\n',
    sourceDocx: resolveSourceDocx({ explicitSource, docsDir, repoRoot }),
    toLoginEnvPrefix,
  };
}
