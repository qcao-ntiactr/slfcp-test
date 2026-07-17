import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { platform } from 'node:os';

import { appDir } from './assessment-utils.mjs';

const require = createRequire(import.meta.url);
const defaultPort = 7357;

function parseArgs(argv) {
  const options = {
    host: process.env.WCAG_VIEWER_HOST ?? 'localhost',
    port: Number(process.env.WCAG_VIEWER_PORT ?? defaultPort),
    open: process.env.WCAG_VIEWER_OPEN !== 'false',
    help: false,
  };
  const unknown = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '-h' || arg === '--help' || arg === 'help') {
      options.help = true;
      continue;
    }
    if (arg === '--no-open') {
      options.open = false;
      continue;
    }

    const match = arg.match(/^--?([^=\s]+)=(.+)$/) ?? arg.match(/^([^=\s]+)=(.+)$/);
    const key = match?.[1] ?? arg.replace(/^--/, '');
    const value = match?.[2] ?? argv[index + 1];

    if (key === 'port') {
      if (!match) index += 1;
      options.port = Number(value);
      continue;
    }

    if (key === 'host') {
      if (!match) index += 1;
      options.host = value;
      continue;
    }

    if (key === 'open') {
      if (!match) index += 1;
      options.open = value !== 'false';
      continue;
    }

    unknown.push(arg);
  }

  return { options, unknown };
}

function printUsage() {
  console.log(`
Usage:
  pnpm wcag:viewer

Options:
  --port <port>   Override the viewer port. Default: ${defaultPort}
  --host <host>   Override the viewer host. Default: localhost
  --no-open       Print/reuse the URL without opening a browser.

Environment:
  WCAG_VIEWER_PORT=${defaultPort}
  WCAG_VIEWER_HOST=localhost
  WCAG_VIEWER_OPEN=true
`);
}

async function fetchViewer(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1200),
    });
    const text = await response.text();
    return {
      reachable: true,
      isViewer: response.ok && text.includes('WCAG Compliance Viewer'),
      status: response.status,
    };
  } catch {
    return {
      reachable: false,
      isViewer: false,
      status: null,
    };
  }
}

function openUrl(url) {
  const currentPlatform = platform();
  const command = currentPlatform === 'darwin'
    ? 'open'
    : currentPlatform === 'win32'
      ? 'cmd'
      : 'xdg-open';
  const args = currentPlatform === 'win32'
    ? ['/c', 'start', '', url]
    : [url];

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function startViewer({ host, port, open }) {
  const viteBin = require.resolve('vite/bin/vite.js');
  const child = spawn(process.execPath, [
    viteBin,
    '--host',
    host,
    '--port',
    String(port),
    '--strictPort',
    ...(open ? ['--open'] : []),
  ], {
    cwd: appDir,
    env: {
      ...process.env,
      WCAG_VIEWER_HOST: host,
      WCAG_VIEWER_PORT: String(port),
    },
    stdio: 'inherit',
  });

  const stop = () => {
    if (!child.killed) child.kill('SIGINT');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}

const { options, unknown } = parseArgs(process.argv.slice(2));

if (options.help) {
  printUsage();
  process.exit(0);
}

if (unknown.length > 0) {
  console.error(`Unknown option(s): ${unknown.join(', ')}`);
  printUsage();
  process.exit(1);
}

if (!Number.isInteger(options.port) || options.port <= 0) {
  throw new Error(`Invalid WCAG viewer port: ${options.port}`);
}

const url = `http://${options.host}:${options.port}/`;
const viewerStatus = await fetchViewer(url);

if (viewerStatus.isViewer) {
  console.log(`WCAG viewer already running at ${url}`);
  if (options.open) openUrl(url);
  process.exit(0);
}

if (viewerStatus.reachable) {
  console.error(`Port ${options.port} is already in use, but it does not look like the WCAG viewer.`);
  console.error(`Refusing to start another viewer. Pick a different port with --port or WCAG_VIEWER_PORT.`);
  process.exit(1);
}

console.log(`Starting WCAG viewer at ${url}`);
startViewer(options);
