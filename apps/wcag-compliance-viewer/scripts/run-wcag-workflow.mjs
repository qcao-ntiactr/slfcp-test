import { spawn } from 'node:child_process';
import path from 'node:path';

import { appDir, repoRoot } from './assessment-utils.mjs';

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');

const steps = [
  {
    label: 'Run WCAG setup doctor',
    script: 'wcag-doctor.mjs',
  },
  {
    label: 'Generate WCAG report',
    script: 'generate-wcag-report.mjs',
  },
  {
    label: 'Review WCAG tester coverage',
    script: 'review-wcag-coverage.mjs',
  },
  ...(!checkOnly
    ? [{
        label: 'Open WCAG viewer',
        script: 'open-or-start-viewer.mjs',
      }]
    : []),
];

function runStep(step) {
  const scriptPath = path.join(appDir, 'scripts', step.script);

  console.log('');
  console.log(`[wcag] ${step.label}`);
  console.log(`[wcag] node ${path.relative(repoRoot, scriptPath)}`);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${step.label} stopped by ${signal}`));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${step.label} failed with exit code ${code}`));
    });
  });
}

for (const step of steps) {
  try {
    await runStep(step);
  } catch (error) {
    console.error('');
    console.error(`[wcag] ${error.message}`);
    process.exit(1);
  }
}

console.log('');
console.log(checkOnly ? '[wcag] Check complete.' : '[wcag] Workflow complete.');
