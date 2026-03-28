type DeviceInfo = {
  type?: "phone" | "tablet" | "desktop" | "unknown";
  device?: string;
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  version?: string;
  mobile?: string;
};

export type PushTokenRecord = {
  id: string;
  token: string;
  platform?: string;
  deviceInfo?: DeviceInfo;
  createdAt: string;
  updatedAt: string;
};

const STORE_KEY = "__barcadepro_push_token_store__";

function getStore(): Map<string, PushTokenRecord> {
  const g = globalThis as typeof globalThis & {
    [STORE_KEY]?: Map<string, PushTokenRecord>;
  };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map<string, PushTokenRecord>();
  }
  return g[STORE_KEY]!;
}

function findByToken(token: string): PushTokenRecord | null {
  for (const record of getStore().values()) {
    if (record.token === token) return record;
  }
  return null;
}

export function createOrUpdateByToken(input: {
  token: string;
  platform?: string;
  deviceInfo?: DeviceInfo;
}): PushTokenRecord {
  const existing = findByToken(input.token);
  const now = new Date().toISOString();

  if (existing) {
    const updated: PushTokenRecord = {
      ...existing,
      platform: input.platform ?? existing.platform,
      deviceInfo: input.deviceInfo ?? existing.deviceInfo,
      updatedAt: now,
    };
    getStore().set(existing.id, updated);
    return updated;
  }

  const id = crypto.randomUUID();
  const record: PushTokenRecord = {
    id,
    token: input.token,
    platform: input.platform,
    deviceInfo: input.deviceInfo,
    createdAt: now,
    updatedAt: now,
  };
  getStore().set(id, record);
  return record;
}

export function updateById(
  id: string,
  input: { token?: string; platform?: string; deviceInfo?: DeviceInfo }
): PushTokenRecord | null {
  const existing = getStore().get(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const updated: PushTokenRecord = {
    ...existing,
    token: input.token ?? existing.token,
    platform: input.platform ?? existing.platform,
    deviceInfo: input.deviceInfo ?? existing.deviceInfo,
    updatedAt: now,
  };
  getStore().set(id, updated);
  return updated;
}

export function deleteById(id: string): boolean {
  return getStore().delete(id);
}

export function getById(id: string): PushTokenRecord | null {
  return getStore().get(id) ?? null;
}

export function listTokens(): PushTokenRecord[] {
  return Array.from(getStore().values());
}
