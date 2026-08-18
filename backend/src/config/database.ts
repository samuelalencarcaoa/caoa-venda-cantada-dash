type RelationalDatabaseProvider =
  | 'postgresql'
  | 'mysql'
  | 'sqlserver'
  | 'sqlite'
  | 'cockroachdb';

const DEFAULT_PROVIDER: RelationalDatabaseProvider = 'postgresql';
const SUPPORTED_PROVIDERS: RelationalDatabaseProvider[] = [
  'postgresql',
  'mysql',
  'sqlserver',
  'sqlite',
  'cockroachdb'
];

function parseProvider(value: string | undefined): RelationalDatabaseProvider {
  if (!value) {
    return DEFAULT_PROVIDER;
  }

  if ((SUPPORTED_PROVIDERS as string[]).includes(value)) {
    return value as RelationalDatabaseProvider;
  }

  throw new Error(
    `DATABASE_PROVIDER inválido. Valores aceitos: ${SUPPORTED_PROVIDERS.join(', ')}.`
  );
}

function inferProviderFromUrl(url: string): RelationalDatabaseProvider | undefined {
  const protocol = url.match(/^([a-z0-9+.-]+):\/\//i)?.[1]?.toLowerCase();

  if (protocol === 'postgres' || protocol === 'postgresql') return 'postgresql';
  if (protocol === 'mysql') return 'mysql';
  if (protocol === 'sqlserver') return 'sqlserver';
  if (protocol === 'file') return 'sqlite';
  if (protocol === 'cockroachdb') return 'cockroachdb';

  return undefined;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} precisa estar configurado para iniciar a API.`);
  }

  return value;
}

function applyTlsMode(url: string): string {
  if (process.env.DATABASE_TLS_MODE !== 'disabled') {
    return url;
  }

  return url.replace(/([;?])encrypt=true(?=;|&|$)/i, '$1encrypt=false');
}

function parseOptionalInteger(value: string | undefined, fieldName: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} precisa ser um número inteiro não negativo.`);
  }

  return parsed;
}

function parseOptionalPositiveInteger(value: string | undefined, fieldName: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} precisa ser um número inteiro positivo.`);
  }

  return parsed;
}

function normalizeSqlServerOptionKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function appendSqlServerOptions(url: string, options: Record<string, string | undefined>) {
  const entries = Object.entries(options).flatMap(([key, value]) =>
    value === undefined ? [] : [[key, value] as const]
  );

  if (entries.length === 0) {
    return url;
  }

  if (url.includes('?')) {
    const [baseUrl, queryString = ''] = url.split('?');
    const params = new URLSearchParams(queryString);

    for (const [key, value] of entries) {
      const normalizedKey = normalizeSqlServerOptionKey(key);

      for (const existingKey of Array.from(params.keys())) {
        if (normalizeSqlServerOptionKey(existingKey) === normalizedKey) {
          params.delete(existingKey);
        }
      }

      params.set(key, value);
    }

    const nextQuery = params.toString();
    return nextQuery ? `${baseUrl}?${nextQuery}` : baseUrl;
  }

  if (!url.includes(';')) {
    return url;
  }

  const [baseUrl, ...segments] = url.split(';');
  const normalizedEntries = new Map<string, { key: string; value: string }>();
  const orderedKeys: string[] = [];

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = (separatorIndex === -1 ? trimmed : trimmed.slice(0, separatorIndex)).trim();
    const value = separatorIndex === -1 ? '' : trimmed.slice(separatorIndex + 1).trim();
    const normalizedKey = normalizeSqlServerOptionKey(key);

    if (!normalizedEntries.has(normalizedKey)) {
      orderedKeys.push(normalizedKey);
    }

    normalizedEntries.set(normalizedKey, { key, value });
  }

  for (const [key, value] of entries) {
    const normalizedKey = normalizeSqlServerOptionKey(key);

    if (!normalizedEntries.has(normalizedKey)) {
      orderedKeys.push(normalizedKey);
    }

    normalizedEntries.set(normalizedKey, { key, value });
  }

  return [baseUrl, ...orderedKeys.map((key) => {
    const entry = normalizedEntries.get(key);
    return entry ? `${entry.key}=${entry.value}` : '';
  }).filter(Boolean)].join(';');
}

function applySqlServerPoolSettings(url: string): string {
  const connectionLimit = parseOptionalPositiveInteger(
    process.env.DATABASE_CONNECTION_LIMIT,
    'DATABASE_CONNECTION_LIMIT'
  );
  const poolTimeout = parseOptionalInteger(
    process.env.DATABASE_POOL_TIMEOUT_SECONDS,
    'DATABASE_POOL_TIMEOUT_SECONDS'
  );

  return appendSqlServerOptions(url, {
    connectionLimit: connectionLimit !== undefined ? String(connectionLimit) : undefined,
    poolTimeout: String(poolTimeout ?? 60)
  });
}

export function getDatabaseConfig() {
  const url = applyTlsMode(requireEnv('DATABASE_URL'));
  const provider = parseProvider(process.env.DATABASE_PROVIDER ?? inferProviderFromUrl(url));

  return {
    provider,
    url: provider === 'sqlserver' ? applySqlServerPoolSettings(url) : url,
    supportedProviders: SUPPORTED_PROVIDERS
  } as const;
}

export type { RelationalDatabaseProvider };
