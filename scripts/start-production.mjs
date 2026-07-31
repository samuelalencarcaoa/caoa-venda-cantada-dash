import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createConnection } from 'node:net';

const isWindows = process.platform === 'win32';
const pnpm = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm';
const pnpmPrefix = isWindows ? ['/d', '/s', '/c', 'pnpm'] : [];
const envFile = resolve(process.env.ENV_FILE ?? '.env.production');

function getPnpmArgs(args) {
  return [...pnpmPrefix, ...args];
}

function readEnvFile(path) {
  if (!existsSync(path)) {
    throw new Error(
      `Arquivo de ambiente nao encontrado: ${path}. Copie .env.production.example para .env.production e preencha os valores.`
    );
  }

  const values = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

let environment;

function run(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(pnpm, getPnpmArgs(args), {
      stdio: 'inherit',
      env: environment,
      windowsHide: true
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) return resolvePromise();
      reject(new Error(`Comando pnpm ${args.join(' ')} terminou com ${signal ?? `codigo ${code}`}.`));
    });
  });
}

function isApiAvailable() {
  return new Promise((resolvePromise) => {
    const socket = createConnection({ host: '127.0.0.1', port: 4000 });
    socket.once('connect', () => {
      socket.destroy();
      resolvePromise(true);
    });
    socket.once('error', () => resolvePromise(false));
  });
}

async function waitForApi() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await isApiAvailable()) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
  }
  throw new Error('A API nao ficou disponivel na porta 4000 em 60 segundos.');
}

const runningChildren = [];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of runningChildren) child.kill('SIGTERM');
  process.exit(exitCode);
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

try {
  environment = {
    ...process.env,
    ...readEnvFile(envFile),
    NODE_ENV: 'production'
  };
  console.log(`Usando configuracao de producao: ${envFile}`);
  await run(['--filter', 'caoa-venda-cantada-api', 'build']);
  await run(['--filter', 'caoa-venda-cantada-web', 'build']);

  if (await isApiAvailable()) {
    console.log('API existente detectada na porta 4000; reutilizando o processo em execucao.');
  } else {
    const api = spawn(
      pnpm,
      getPnpmArgs(['--filter', 'caoa-venda-cantada-api', 'start']),
      {
        stdio: 'inherit',
        env: environment,
        windowsHide: true
      }
    );
    runningChildren.push(api);
    api.once('error', (error) => {
      console.error(error);
      stop(1);
    });
    api.once('exit', (code) => {
      if (!stopping) {
        console.error(`A API foi encerrada inesperadamente (codigo ${code}).`);
        stop(1);
      }
    });

    await waitForApi();
  }
  const web = spawn(
    pnpm,
    getPnpmArgs(['--filter', 'caoa-venda-cantada-web', 'start']),
    {
      stdio: 'inherit',
      env: environment,
      windowsHide: true
    }
  );
  runningChildren.push(web);
  web.once('error', (error) => {
    console.error(error);
    stop(1);
  });
  web.once('exit', (code) => {
    if (!stopping) {
      console.error(`O frontend foi encerrado inesperadamente (codigo ${code}).`);
      stop(1);
    }
  });

  const apiWatchdog = setInterval(async () => {
    if (!(await isApiAvailable())) {
      console.error('A API deixou de responder na porta 4000; reiniciando a aplicacao.');
      clearInterval(apiWatchdog);
      stop(1);
    }
  }, 10_000);
  apiWatchdog.unref();

  console.log('Aplicacao em producao: frontend em http://localhost:3003 e API em http://localhost:4000.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  stop(1);
}
