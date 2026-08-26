import dotenv from 'dotenv';
import { getDatabaseConfig } from './database';

dotenv.config();

function parsePort(value: string | undefined) {
  const parsed = Number(value ?? 4000);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('PORT precisa ser um número inteiro positivo.');
  }

  return parsed;
}

function parseBoolean(value: string | undefined): boolean {
  return value === 'true';
}

const database = getDatabaseConfig();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  HOST: process.env.BACKEND_HOST ?? '127.0.0.1',
  PORT: parsePort(process.env.PORT),
  TLS_ENABLED: parseBoolean(process.env.TLS_ENABLED),
  TLS_CERT_PATH: process.env.TLS_CERT_PATH,
  TLS_KEY_PATH: process.env.TLS_KEY_PATH,
  DATABASE_PROVIDER: database.provider,
  DATABASE_URL: database.url,
  DATABASE_SUPPORTED_PROVIDERS: database.supportedProviders,
  databaseProvider: database.provider,
  databaseUrl: database.url,
  databaseSupportedProviders: database.supportedProviders
};
