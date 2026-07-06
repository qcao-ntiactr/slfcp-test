// run-playwright-test.mjs
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';

async function selectTestDirectory() {
  const baseDir = './scripts';
  const entries = await fs.readdir(baseDir, { withFileTypes: true });

  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((dir) => path.join(baseDir, dir.name));

  const { selectedDir } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedDir',
      message: 'Select a test directory:',
      choices: folders,
    },
  ]);

  return selectedDir;
}

async function listTests(testDir) {
  const files = await fs.readdir(testDir);
  return files.filter((file) => file.endsWith('.spec.ts'));
}

async function main() {
  const TESTS_DIR = await selectTestDirectory();

  while (true) {
    const testFiles = await listTests(TESTS_DIR);

    const { selectedTest } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTest',
        message: 'Select a Playwright test to run:',
        choices: [...testFiles, new inquirer.Separator(), 'Quit'],
      },
    ]);

    if (selectedTest === 'Quit') {
      console.log('Exiting...');
      break;
    }

    const testPath = path.join(TESTS_DIR, selectedTest);
    console.log(`\nRunning test: ${testPath}\n`);

    await new Promise((resolve, reject) => {
      exec(
        `npx playwright test ${testPath} --headed`,
        (err, stdout, stderr) => {
          if (err) {
            console.error(`Error: ${stderr}`);
            reject(err);
          } else {
            console.log(stdout);
            resolve();
          }
        }
      );
    });

    console.log('\n✔️ Test finished.\n');
  }
}

main();
