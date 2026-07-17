import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const distDir = path.join(appDir, 'dist');
const indexPath = path.join(distDir, 'index.html');
const singleFilePath = path.join(distDir, 'wcag-compliance-viewer.html');

if (!existsSync(indexPath)) {
  throw new Error(`Expected build output at ${path.relative(appDir, indexPath)}. Run vite build first.`);
}

const readAsset = (assetPath) => {
  const normalizedPath = assetPath.replace(/^\.\//, '');
  const absolutePath = path.join(distDir, normalizedPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Could not inline missing asset: ${normalizedPath}`);
  }

  return readFileSync(absolutePath, 'utf8');
};

let html = readFileSync(indexPath, 'utf8');

html = html.replace(
  /<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)">\s*/g,
  (_match, href) => `<style>\n${readAsset(href)}\n</style>\n`
);

html = html.replace(
  /<script\s+type="module"\s+crossorigin\s+src="([^"]+)"><\/script>/g,
  (_match, src) => `<script type="module">\n${readAsset(src)}\n</script>`
);

writeFileSync(indexPath, html, 'utf8');
writeFileSync(singleFilePath, html, 'utf8');

console.log(`Inlined WCAG viewer assets into ${path.relative(appDir, indexPath)}.`);
console.log(`Wrote single-file WCAG viewer to ${path.relative(appDir, singleFilePath)}.`);
