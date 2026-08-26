import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { env } from './config/env';
import app from './app';

const databaseProviderLabel: Record<typeof env.DATABASE_PROVIDER, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  sqlserver: 'SQL Server',
  sqlite: 'SQLite',
  cockroachdb: 'CockroachDB',
};

function getServer() {
  if (!env.TLS_ENABLED) {
    return createHttpServer(app);
  }

  const certificatePath = resolve(process.cwd(), env.TLS_CERT_PATH ?? '');
  const keyPath = resolve(process.cwd(), env.TLS_KEY_PATH ?? '');

  if (!env.TLS_CERT_PATH || !env.TLS_KEY_PATH || !existsSync(certificatePath) || !existsSync(keyPath)) {
    throw new Error(
      'TLS_ENABLED=true exige TLS_CERT_PATH e TLS_KEY_PATH apontando para um certificado e chave privada validos.'
    );
  }

  return createHttpsServer(
    {
      cert: readFileSync(certificatePath),
      key: readFileSync(keyPath),
      minVersion: 'TLSv1.2',
    },
    app
  );
}

const server = getServer();

server.listen(env.PORT, env.HOST, () => {
  const protocol = env.TLS_ENABLED ? 'https' : 'http';
  console.log(
    `Backend rodando em ${protocol}://${env.HOST}:${env.PORT} usando ${databaseProviderLabel[env.DATABASE_PROVIDER]}`
  );
});
