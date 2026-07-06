#!/usr/bin/env node

import { execSync } from 'child_process';

const sequentialSteps = [
  { name: 'ESM Import Check', command: 'node scripts/check-esm-imports.js' },
  { name: 'Format Check', command: 'pnpm format:check' },
  { name: 'Lint', command: 'pnpm lint' },
  { name: 'Build', command: 'pnpm build' },
];

const parallelSteps = [
  { name: 'Unit Tests', command: 'pnpm test:unit' },
  { name: 'Integration Tests', command: 'pnpm test:integration' },
  { name: 'System Tests', command: 'pnpm test:system' },
  {
    name: 'Playwright: Request Form',
    command:
      'cd ./apps/frontend/user-experience-automation-scripts/ && npx playwright test scripts/request-form/all-tabs-good-values.spec.ts',
  },
  {
    name: 'Playwright: Request Draft Form',
    command:
      'cd ./apps/frontend/user-experience-automation-scripts/ && npx playwright test scripts/request-draft-form/commercial-user-draft-workflow.spec.ts',
  },
  {
    name: 'Playwright: Complete Request and Inquiry Workflow',
    command:
      'cd ./apps/frontend/user-experience-automation-scripts/ && npx playwright test scripts/inquiries/complete-request-and-inquiry-workflow.spec.ts',
  },
  {
    name: 'Playwright: Common Conditions Library Happy Path',
    command:
      'cd ./apps/frontend/user-experience-automation-scripts/ && npx playwright test scripts/common-conditions/happy-path-common-conditions-library.spec.ts',
  },
];

const allSteps = [...sequentialSteps, ...parallelSteps];
let passed = 0;
let failed = 0;

console.log('\n🔥 Running Smoke Tests\n');

async function runTest(step, stepNumber, totalSteps) {
  process.stdout.write(`[${stepNumber}/${totalSteps}] ${step.name}... `);

  try {
    execSync(step.command, {
      stdio: 'pipe',
      shell: process.platform === 'win32' ? 'cmd' : '/bin/sh',
    });
    console.log('✅');
    return true;
  } catch (_error) {
    console.log('❌');
    return false;
  }
}

async function main() {
  for (let i = 0; i < sequentialSteps.length; i++) {
    const step = sequentialSteps[i];
    const stepNumber = i + 1;
    if (await runTest(step, stepNumber, allSteps.length)) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n⚡ Running tests in parallel...\n');

  const parallelPromises = parallelSteps.map((step, index) => {
    const stepNumber = sequentialSteps.length + index + 1;
    return runTest(step, stepNumber, allSteps.length);
  });

  const results = await Promise.all(parallelPromises);
  passed += results.filter((r) => r).length;
  failed += results.filter((r) => !r).length;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
