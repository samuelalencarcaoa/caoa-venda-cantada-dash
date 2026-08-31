import { existsSync, readFileSync } from "node:fs";

type UnknownRecord = Record<string, unknown>;

export type AzureAdIdTokenClaims = Record<string, unknown>;

export type AzureAdGraphProfile = {
  id?: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  mail?: string;
  mobilePhone?: string;
  officeLocation?: string;
  preferredLanguage?: string;
  businessPhones?: string[];
  companyName?: string;
  department?: string;
  city?: string;
  state?: string;
  country?: string;
  streetAddress?: string;
  postalCode?: string;
  userPrincipalName?: string;
  employeeId?: string;
  employeeType?: string;
  usageLocation?: string;
};

export type AzureAdExportManager = {
  displayName?: string;
  distinguishedName?: string;
};

export type AzureAdDirectoryProfile = {
  source: "azure-ad";
  fetchedAt: string;
  photoAvailable: boolean;
  stableId: string | null;
  claims: AzureAdIdTokenClaims;
  graph: AzureAdGraphProfile | null;
  adExportManager: AzureAdExportManager | null;
};

export type AzureAdDirectorySnapshot = {
  directory: AzureAdDirectoryProfile;
  picture: string | null;
  displayName: string | null;
  email: string | null;
  stableId: string | null;
};

const GRAPH_PROFILE_SELECT = [
  "id",
  "displayName",
  "givenName",
  "surname",
  "jobTitle",
  "mail",
  "mobilePhone",
  "officeLocation",
  "preferredLanguage",
  "businessPhones",
  "companyName",
  "department",
  "city",
  "state",
  "country",
  "streetAddress",
  "postalCode",
  "userPrincipalName",
  "employeeId",
  "employeeType",
  "usageLocation",
].join(",");

function getRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim())?.trim();
}

export function readRecordString(value: Record<string, unknown> | null | undefined, key: string) {
  const field = value?.[key];
  return typeof field === "string" && field.trim() ? field.trim() : undefined;
}

export function readRecordStringArray(
  value: Record<string, unknown> | null | undefined,
  key: string
) {
  const field = value?.[key];
  if (!Array.isArray(field)) {
    return undefined;
  }

  const result = field
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

  return result.length > 0 ? result : undefined;
}

export function decodeAzureAdIdToken(idToken?: string | null) {
  if (!idToken) {
    return null;
  }

  const segments = idToken.split(".");
  if (segments.length < 2) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8")) as AzureAdIdTokenClaims;
  } catch {
    return null;
  }
}

function normalizeClaims(source: unknown): AzureAdIdTokenClaims {
  const record = getRecord(source);
  return record ? { ...record } : {};
}

function normalizeGraphProfile(source: unknown): AzureAdGraphProfile | null {
  const record = getRecord(source);
  if (!record) {
    return null;
  }

  return {
    id: readRecordString(record, "id"),
    displayName: readRecordString(record, "displayName"),
    givenName: readRecordString(record, "givenName"),
    surname: readRecordString(record, "surname"),
    jobTitle: readRecordString(record, "jobTitle"),
    mail: readRecordString(record, "mail"),
    mobilePhone: readRecordString(record, "mobilePhone"),
    officeLocation: readRecordString(record, "officeLocation"),
    preferredLanguage: readRecordString(record, "preferredLanguage"),
    businessPhones: readRecordStringArray(record, "businessPhones"),
    companyName: readRecordString(record, "companyName"),
    department: readRecordString(record, "department"),
    city: readRecordString(record, "city"),
    state: readRecordString(record, "state"),
    country: readRecordString(record, "country"),
    streetAddress: readRecordString(record, "streetAddress"),
    postalCode: readRecordString(record, "postalCode"),
    userPrincipalName: readRecordString(record, "userPrincipalName"),
    employeeId: readRecordString(record, "employeeId"),
    employeeType: readRecordString(record, "employeeType"),
    usageLocation: readRecordString(record, "usageLocation"),
  };
}

function normalizeLookupValue(value?: string | null) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function getManagerDisplayName(distinguishedName: string) {
  const commonName = distinguishedName.match(/^CN=([^,]+)/i)?.[1]?.trim();
  return commonName || distinguishedName.trim();
}

export function findAdExportManager({
  claims,
  graph,
}: {
  claims: AzureAdIdTokenClaims;
  graph: AzureAdGraphProfile | null;
}): AzureAdExportManager | null {
  const exportPath = process.env.AD_EXPORT_PATH;
  if (!exportPath || !existsSync(exportPath)) {
    return null;
  }

  const identifiers = new Set(
    [
      readRecordString(claims, "name"),
      readRecordString(claims, "email"),
      readRecordString(claims, "preferred_username"),
      readRecordString(claims, "upn"),
      graph?.displayName,
      graph?.mail,
      graph?.userPrincipalName,
    ]
      .map(normalizeLookupValue)
      .filter(Boolean)
  );

  for (const identifier of [...identifiers]) {
    if (identifier.includes("@")) {
      identifiers.add(identifier.split("@", 1)[0]);
    }
  }

  if (identifiers.size === 0) {
    return null;
  }

  try {
    const rows = readFileSync(exportPath, "utf8").split(/\r?\n/);
    const headers = rows.shift()?.split(";").map((header) => header.trim().toLocaleLowerCase());
    if (!headers) {
      return null;
    }

    const emailIndex = headers.indexOf("emailaddress");
    const upnIndex = headers.indexOf("userprincipalname");
    const samAccountNameIndex = headers.indexOf("samaccountname");
    const displayNameIndex = headers.indexOf("displayname");
    const managerIndex = headers.indexOf("manager");
    if (
      managerIndex < 0 ||
      (emailIndex < 0 && upnIndex < 0 && samAccountNameIndex < 0 && displayNameIndex < 0)
    ) {
      return null;
    }

    for (const row of rows) {
      if (!row.trim()) {
        continue;
      }

      const values = row.split(";");
      const matchesUser = [
        values[emailIndex],
        values[upnIndex],
        values[samAccountNameIndex],
        values[displayNameIndex],
      ]
        .filter(Boolean)
        .some((value) => identifiers.has(normalizeLookupValue(value)));
      const managerDn = values[managerIndex]?.trim();

      if (matchesUser && managerDn) {
        return {
          displayName: getManagerDisplayName(managerDn),
          distinguishedName: managerDn,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchAzureAdGraphProfile(accessToken?: string | null) {
  if (!accessToken) {
    return null;
  }

  try {
    const params = new URLSearchParams();
    params.set("$select", GRAPH_PROFILE_SELECT);

    const response = await fetch(`https://graph.microsoft.com/v1.0/me?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return normalizeGraphProfile(await response.json());
  } catch {
    return null;
  }
}

async function fetchAzureAdPhoto(accessToken?: string | null) {
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/photos/48x48/$value", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function buildAzureAdDirectorySnapshot({
  claimsSource,
  accessToken,
}: {
  claimsSource: unknown;
  accessToken?: string | null;
}): Promise<AzureAdDirectorySnapshot> {
  const [graph, picture] = await Promise.all([
    fetchAzureAdGraphProfile(accessToken),
    fetchAzureAdPhoto(accessToken),
  ]);

  const claims = normalizeClaims(claimsSource);
  const adExportManager = findAdExportManager({ claims, graph });
  const graphDisplayName = firstDefined(
    graph?.displayName,
    graph?.givenName && graph?.surname ? `${graph.givenName} ${graph.surname}` : undefined
  );
  const displayName = firstDefined(
    readRecordString(claims, "name"),
    graphDisplayName,
    readRecordString(claims, "preferred_username"),
    readRecordString(claims, "upn")
  );
  const email = firstDefined(
    readRecordString(claims, "email"),
    readRecordString(claims, "preferred_username"),
    graph?.mail,
    graph?.userPrincipalName
  );
  const stableId = firstDefined(
    readRecordString(claims, "oid"),
    graph?.id,
    readRecordString(claims, "sub")
  );

  return {
    directory: {
      source: "azure-ad",
      fetchedAt: new Date().toISOString(),
      photoAvailable: Boolean(picture),
      stableId: stableId ?? null,
      claims,
      graph,
      adExportManager,
    },
    picture,
    displayName: displayName ?? null,
    email: email ?? null,
    stableId: stableId ?? null,
  };
}
