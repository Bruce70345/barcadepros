import crypto from "crypto";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

type AccessTokenCache = {
  token: string;
  expiresAt: number;
};

let cachedToken: AccessTokenCache | null = null;

function getServiceAccount() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "";
  const privateKey = keyRaw.replace(/\\n/g, "\n");
  if (!email || !privateKey) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL/KEY");
  }
  return { email, privateKey };
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.token;
  }

  const { email, privateKey } = getServiceAccount();
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claim}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(privateKey);
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get access token: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };
  return data.access_token;
}

function getSheetId() {
  const id = process.env.GOOGLE_SHEET_ID || "";
  if (!id) throw new Error("Missing GOOGLE_SHEET_ID");
  return id;
}

async function sheetsRequest(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getSheetValues(sheetName: string) {
  const data = await sheetsRequest(`/values/${encodeURIComponent(sheetName)}!A1:Z`);
  const values = (data.values || []) as string[][];
  const headers = values[0] || [];
  const rows = values.slice(1);
  return { headers, rows };
}

export async function appendRow(sheetName: string, row: string[]) {
  return sheetsRequest(
    `/values/${encodeURIComponent(sheetName)}!A1:Z:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values: [row] }),
    }
  );
}

export async function updateRow(sheetName: string, rowNumber: number, row: string[]) {
  return sheetsRequest(`/values/${encodeURIComponent(sheetName)}!A${rowNumber}:Z${rowNumber}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [row] }),
  });
}

export async function batchUpdateRows(
  sheetName: string,
  updates: { rowNumber: number; values: string[] }[]
) {
  if (updates.length === 0) return;
  const data = {
    valueInputOption: "RAW",
    data: updates.map((u) => ({
      range: `${sheetName}!A${u.rowNumber}:Z${u.rowNumber}`,
      values: [u.values],
    })),
  };
  return sheetsRequest(`/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
