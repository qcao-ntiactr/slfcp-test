#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to scan
const SCAN_DIRS = [
  path.resolve(__dirname, '../apps/backend/api/src'),
  // Add other directories if needed
];

const FILE_EXTENSIONS = ['.ts', '.js'];
// Regex to match relative imports: import ... from './foo' or import ... from '../bar'
// Matches: from './something', from '../something', import './something'
// Excludes: imports that already have an extension (ending in .js, .css, .json, etc.)
const RELATIVE_IMPORT_REGEX =
  /(?:import|export)\s+.*?\s+from\s+['"](\.\.?\/[^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT_REGEX = /import\s+['"](\.\.?\/[^'"]+)['"]/g;

let totalErrors = 0;

function checkFile(filePath) {
  // Skip .d.ts files as they are not used at runtime by node
  if (filePath.endsWith('.d.ts')) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fileHasError = false;

  const checkMatch = (match, importPath, lineIndex) => {
    // If it's a relative path and doesn't end in .js, it's a problem in ESM
    // ESM in Node.js requires full file extensions in the output
    // Even if we are writing .ts, we should use .js extension
    if (!importPath.endsWith('.js')) {
      if (!fileHasError) {
        console.error(`\n❌ Missing .js extension in: ${filePath}`);
        fileHasError = true;
      }
      console.error(`   Line ${lineIndex + 1}: ${match}`);
      totalErrors++;
    }
  };

  lines.forEach((line, index) => {
    let match;
    // Reset regex lastIndex because of global flag
    RELATIVE_IMPORT_REGEX.lastIndex = 0;
    while ((match = RELATIVE_IMPORT_REGEX.exec(line)) !== null) {
      checkMatch(match[0], match[1], index);
    }

    SIDE_EFFECT_IMPORT_REGEX.lastIndex = 0;
    while ((match = SIDE_EFFECT_IMPORT_REGEX.exec(line)) !== null) {
      checkMatch(match[0], match[1], index);
    }
  });
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        walkDir(filePath);
      }
    } else if (FILE_EXTENSIONS.includes(path.extname(filePath))) {
      checkFile(filePath);
    }
  }
}

console.log('🔍 Checking for missing .js extensions in ESM imports...');

SCAN_DIRS.forEach((dir) => {
  if (fs.existsSync(dir)) {
    walkDir(dir);
  } else {
    console.warn(`⚠️ Warning: Directory not found: ${dir}`);
  }
});

if (totalErrors > 0) {
  console.error(`\nFound ${totalErrors} missing .js extensions.`);
  process.exit(1);
} else {
  console.log('✅ All relative imports have extensions.');
  process.exit(0);
}
