import crypto from "crypto";
import {
  appendRow,
  batchUpdateRows,
  getSheetValues,
  updateRow,
} from "@/server/googleSheets";
import { assertHeaders } from "@/server/schema";

const SHEET_USERS = "users";
const SHEET_DEVICES = "user_devices";
const SHEET_EVENTS = "events";
const SHEET_EVENT_ATTENDEES = "event_attendees";
const SHEET_NOTIFICATIONS = "notifications";
const RECURRENCE_END_DATE = new Date(Date.UTC(2026, 5, 30, 23, 59, 59, 999));
const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const RECURRENCE_SERIES_KEY = "SERIES";

type UserRecord = {
  id: string;
  email: string;
  name: string;
  receive_realtime: boolean;
  receive_digest: boolean;
  is_active: boolean;
  is_admin: boolean;
  deactivated_at?: string;
  created_at: string;
  updated_at: string;
};

type DeviceRecord = {
  id: string;
  user_id: string;
  fcm_token: string;
  platform?: string;
  updated_at: string;
  is_active: boolean;
};

type EventRecord = {
  id: string;
  user_id: string;
  title: string;
  category?: string;
  location?: string;
  description?: string;
  start_at: string;
  send_realtime: boolean;
  recurrence_rule?: string;
  created_at: string;
};

type EventAttendeeRecord = {
  id: string;
  event_id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type NotificationRecord = {
  id: string;
  type: "realtime" | "digest";
  title: string;
  body: string;
  send_at: string;
  status: "pending" | "sent" | "failed" | "skipped";
  created_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function toBool(value: string | boolean | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  const v = String(value).toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "y" || v === "t";
}

function fromBool(value: boolean) {
  return value ? "TRUE" : "FALSE";
}

function mapRows<T>(headers: string[], rows: string[][]): T[] {
  return rows.map((row) => {
    const obj: any = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj as T;
  });
}

function buildRow(headers: string[], data: Record<string, string>) {
  return headers.map((h) => data[h] ?? "");
}

function parseRecurrenceRule(rule?: string) {
  if (!rule) return null;
  const parts = rule
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const map = new Map<string, string>();
  parts.forEach((part) => {
    const [key, value] = part.split("=");
    if (!key || !value) return;
    map.set(key.toUpperCase(), value);
  });
  return {
    freq: map.get("FREQ"),
    interval: map.get("INTERVAL"),
    byday: map.get("BYDAY"),
    seriesId: map.get(RECURRENCE_SERIES_KEY),
    parts,
  };
}

function ensureSeriesId(rule?: string, seriesId?: string) {
  if (!rule) return { rule, seriesId: undefined };
  const parsed = parseRecurrenceRule(rule);
  const existing = parsed?.seriesId;
  const finalId = existing || seriesId || crypto.randomUUID();
  if (existing) return { rule, seriesId: existing };
  const parts = parsed?.parts ? [...parsed.parts] : [rule];
  parts.push(`${RECURRENCE_SERIES_KEY}=${finalId}`);
  return { rule: parts.join(";"), seriesId: finalId };
}

function isWeeklyRule(rule?: string) {
  const parsed = parseRecurrenceRule(rule);
  return parsed?.freq === "WEEKLY";
}

function extractSeriesId(rule?: string) {
  return parseRecurrenceRule(rule)?.seriesId;
}

async function loadUsers() {
  const { headers, rows } = await getSheetValues(SHEET_USERS);
  assertHeaders("users", headers);
  const mapped = mapRows<UserRecord>(headers, rows).map((u) => ({
    ...u,
    receive_realtime: toBool((u as any).receive_realtime),
    receive_digest: toBool((u as any).receive_digest),
    is_active: toBool((u as any).is_active),
    is_admin: toBool((u as any).is_admin),
  }));
  return { headers, rows, mapped };
}

async function loadDevices() {
  const { headers, rows } = await getSheetValues(SHEET_DEVICES);
  assertHeaders("user_devices", headers);
  const mapped = mapRows<DeviceRecord>(headers, rows).map((d) => ({
    ...d,
    is_active: toBool((d as any).is_active),
  }));
  return { headers, rows, mapped };
}

async function loadEvents() {
  const { headers, rows } = await getSheetValues(SHEET_EVENTS);
  assertHeaders("events", headers);
  const mapped = mapRows<EventRecord>(headers, rows).map((e) => ({
    ...e,
    send_realtime: toBool((e as any).send_realtime),
  }));
  return { headers, rows, mapped };
}

async function loadEventAttendees() {
  const { headers, rows } = await getSheetValues(SHEET_EVENT_ATTENDEES);
  assertHeaders("event_attendees", headers);
  const mapped = mapRows<EventAttendeeRecord>(headers, rows).map((a) => ({
    ...a,
    is_active: toBool((a as any).is_active),
  }));
  return { headers, rows, mapped };
}

async function loadNotifications() {
  const { headers, rows } = await getSheetValues(SHEET_NOTIFICATIONS);
  assertHeaders("notifications", headers);
  const mapped = mapRows<NotificationRecord>(headers, rows);
  return { headers, rows, mapped };
}

export async function upsertUser(input: {
  name: string;
  email?: string;
}): Promise<UserRecord> {
  const { headers, rows, mapped } = await loadUsers();
  const nameTarget = input.name.trim();
  const emailTarget = input.email?.trim().toLowerCase() || "";
  const existing = emailTarget
    ? mapped.find(
        (u) =>
          u.email?.toLowerCase() === emailTarget && u.name === nameTarget
      )
    : mapped.find((u) => u.name === nameTarget);
  const now = nowIso();

  if (existing) {
    const updated: UserRecord = {
      ...existing,
      name: nameTarget,
      email: emailTarget || existing.email,
      is_active: true,
      deactivated_at: "",
      updated_at: now,
    };
    const rowNumber = mapped.indexOf(existing) + 2;
    const row = buildRow(headers, {
      ...updated,
      receive_realtime: fromBool(updated.receive_realtime),
      receive_digest: fromBool(updated.receive_digest),
      is_active: fromBool(updated.is_active),
      is_admin: fromBool(updated.is_admin),
      deactivated_at: updated.deactivated_at || "",
    } as any);
    await updateRow(SHEET_USERS, rowNumber, row);
    return updated;
  }

  const id = crypto.randomUUID();
  const record: UserRecord = {
    id,
    email: emailTarget,
    name: nameTarget,
    receive_realtime: true,
    receive_digest: true,
    is_active: true,
    is_admin: false,
    created_at: now,
    updated_at: now,
  };

  const row = buildRow(headers, {
    ...record,
    receive_realtime: fromBool(record.receive_realtime),
    receive_digest: fromBool(record.receive_digest),
    is_active: fromBool(record.is_active),
    is_admin: fromBool(record.is_admin),
    deactivated_at: "",
  } as any);
  await appendRow(SHEET_USERS, row);
  return record;
}

export async function updateUserPreferences(input: {
  user_id: string;
  receive_realtime?: boolean;
  receive_digest?: boolean;
}): Promise<UserRecord | null> {
  const { headers, mapped } = await loadUsers();
  const existing = mapped.find((u) => u.id === input.user_id);
  if (!existing) return null;
  const now = nowIso();
  const updated: UserRecord = {
    ...existing,
    receive_realtime:
      typeof input.receive_realtime === "boolean"
        ? input.receive_realtime
        : existing.receive_realtime,
    receive_digest:
      typeof input.receive_digest === "boolean"
        ? input.receive_digest
        : existing.receive_digest,
    updated_at: now,
  };
  const rowNumber = mapped.indexOf(existing) + 2;
  const row = buildRow(headers, {
    ...updated,
    receive_realtime: fromBool(updated.receive_realtime),
    receive_digest: fromBool(updated.receive_digest),
    is_active: fromBool(updated.is_active),
    is_admin: fromBool(updated.is_admin),
    deactivated_at: updated.deactivated_at || "",
  } as any);
  await updateRow(SHEET_USERS, rowNumber, row);
  return updated;
}

export async function updateUserName(input: {
  user_id: string;
  name: string;
}): Promise<UserRecord | null> {
  const { headers, mapped } = await loadUsers();
  const existing = mapped.find((u) => u.id === input.user_id);
  if (!existing) return null;
  const now = nowIso();
  const updated: UserRecord = {
    ...existing,
    name: input.name.trim(),
    updated_at: now,
  };
  const rowNumber = mapped.indexOf(existing) + 2;
  const row = buildRow(headers, {
    ...updated,
    receive_realtime: fromBool(updated.receive_realtime),
    receive_digest: fromBool(updated.receive_digest),
    is_active: fromBool(updated.is_active),
    is_admin: fromBool(updated.is_admin),
    deactivated_at: updated.deactivated_at || "",
  } as any);
  await updateRow(SHEET_USERS, rowNumber, row);
  return updated;
}

export async function deactivateUser(user_id: string): Promise<UserRecord | null> {
  const { headers, mapped } = await loadUsers();
  const existing = mapped.find((u) => u.id === user_id);
  if (!existing) return null;
  const now = nowIso();
  const updated: UserRecord = {
    ...existing,
    is_active: false,
    deactivated_at: now,
    updated_at: now,
  };
  const rowNumber = mapped.indexOf(existing) + 2;
  const row = buildRow(headers, {
    ...updated,
    receive_realtime: fromBool(updated.receive_realtime),
    receive_digest: fromBool(updated.receive_digest),
    is_active: fromBool(updated.is_active),
    is_admin: fromBool(updated.is_admin),
    deactivated_at: updated.deactivated_at || "",
  } as any);
  await updateRow(SHEET_USERS, rowNumber, row);
  return updated;
}

export async function listActiveUsersByPreference(input: {
  realtime?: boolean;
  digest?: boolean;
}): Promise<UserRecord[]> {
  const { mapped } = await loadUsers();
  return mapped.filter((u) => {
    if (!u.is_active) return false;
    if (input.realtime && !u.receive_realtime) return false;
    if (input.digest && !u.receive_digest) return false;
    return true;
  });
}

export async function getUserById(user_id: string): Promise<UserRecord | null> {
  const { mapped } = await loadUsers();
  return mapped.find((u) => u.id === user_id) ?? null;
}

export async function upsertDevice(input: {
  user_id: string;
  fcm_token: string;
  platform?: string;
}): Promise<DeviceRecord> {
  const { headers, mapped } = await loadDevices();
  const byToken = mapped.find((d) => d.fcm_token === input.fcm_token);
  const byUserPlatform = input.platform
    ? mapped.find((d) => d.user_id === input.user_id && d.platform === input.platform)
    : undefined;
  const existing = byToken || byUserPlatform;
  const now = nowIso();

  if (existing) {
    const updated: DeviceRecord = {
      ...existing,
      user_id: input.user_id,
      fcm_token: input.fcm_token,
      platform: input.platform ?? existing.platform,
      updated_at: now,
      is_active: true,
    };
    const rowNumber = mapped.indexOf(existing) + 2;
    const row = buildRow(headers, {
      ...updated,
      is_active: fromBool(updated.is_active),
    } as any);
    await updateRow(SHEET_DEVICES, rowNumber, row);
    return updated;
  }

  const id = crypto.randomUUID();
  const record: DeviceRecord = {
    id,
    user_id: input.user_id,
    fcm_token: input.fcm_token,
    platform: input.platform,
    updated_at: now,
    is_active: true,
  };
  const row = buildRow(headers, {
    ...record,
    is_active: fromBool(record.is_active),
  } as any);
  await appendRow(SHEET_DEVICES, row);
  return record;
}

export async function listDevices(user_id?: string): Promise<DeviceRecord[]> {
  const { mapped } = await loadDevices();
  if (!user_id) return mapped;
  return mapped.filter((d) => d.user_id === user_id);
}

export async function updateDeviceStatus(
  id: string,
  input: { is_active?: boolean }
): Promise<DeviceRecord | null> {
  const { headers, mapped } = await loadDevices();
  const existing = mapped.find((d) => d.id === id);
  if (!existing) return null;
  const now = nowIso();
  const updated: DeviceRecord = {
    ...existing,
    is_active:
      typeof input.is_active === "boolean" ? input.is_active : existing.is_active,
    updated_at: now,
  };
  const rowNumber = mapped.indexOf(existing) + 2;
  const row = buildRow(headers, {
    ...updated,
    is_active: fromBool(updated.is_active),
  } as any);
  await updateRow(SHEET_DEVICES, rowNumber, row);
  return updated;
}

export async function deactivateDevicesByUser(user_id: string): Promise<number> {
  const { headers, mapped } = await loadDevices();
  const updates: { rowNumber: number; values: string[] }[] = [];
  let count = 0;
  mapped.forEach((device, idx) => {
    if (device.user_id !== user_id) return;
    const updated: DeviceRecord = {
      ...device,
      is_active: false,
      updated_at: nowIso(),
    };
    const row = buildRow(headers, {
      ...updated,
      is_active: fromBool(updated.is_active),
    } as any);
    updates.push({ rowNumber: idx + 2, values: row });
    count += 1;
  });
  await batchUpdateRows(SHEET_DEVICES, updates);
  return count;
}

export async function listActiveTokensByUserIds(
  user_ids: string[]
): Promise<string[]> {
  const idSet = new Set(user_ids);
  const { mapped } = await loadDevices();
  return mapped
    .filter((d) => d.is_active && idSet.has(d.user_id))
    .map((d) => d.fcm_token);
}

export async function createEvent(input: {
  user_id: string;
  title: string;
  category?: string;
  location?: string;
  description?: string;
  start_at: string;
  send_realtime: boolean;
  recurrence_rule?: string;
}): Promise<{ primary: EventRecord; count: number }> {
  const { headers } = await loadEvents();
  const now = nowIso();
  const baseRecord: EventRecord = {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    title: input.title,
    category: input.category,
    location: input.location,
    description: input.description,
    start_at: input.start_at,
    send_realtime: input.send_realtime,
    recurrence_rule: input.recurrence_rule,
    created_at: now,
  };

  if (!isWeeklyRule(input.recurrence_rule)) {
    const row = buildRow(headers, {
      ...baseRecord,
      send_realtime: fromBool(baseRecord.send_realtime),
    } as any);
    await appendRow(SHEET_EVENTS, row);
    await upsertEventAttendees([
      { event_id: baseRecord.id, user_id: baseRecord.user_id, is_active: true },
    ]);
    return { primary: baseRecord, count: 1 };
  }

  const normalized = ensureSeriesId(input.recurrence_rule);
  const recurringBase = {
    ...baseRecord,
    recurrence_rule: normalized.rule,
  };
  const startDate = new Date(input.start_at);
  if (Number.isNaN(startDate.getTime())) {
    const row = buildRow(headers, {
      ...recurringBase,
      send_realtime: fromBool(baseRecord.send_realtime),
    } as any);
    await appendRow(SHEET_EVENTS, row);
    await upsertEventAttendees([
      { event_id: recurringBase.id, user_id: recurringBase.user_id, is_active: true },
    ]);
    return { primary: recurringBase, count: 1 };
  }

  const events: EventRecord[] = [];
  let cursor = new Date(startDate.getTime());
  while (cursor.getTime() <= RECURRENCE_END_DATE.getTime()) {
    events.push({
      ...recurringBase,
      id: crypto.randomUUID(),
      start_at: cursor.toISOString(),
      recurrence_rule: normalized.rule,
    });
    cursor = new Date(cursor.getTime() + WEEKLY_INTERVAL_MS);
  }

  if (events.length === 0) {
    const row = buildRow(headers, {
      ...recurringBase,
      send_realtime: fromBool(baseRecord.send_realtime),
    } as any);
    await appendRow(SHEET_EVENTS, row);
    await upsertEventAttendees([
      { event_id: recurringBase.id, user_id: recurringBase.user_id, is_active: true },
    ]);
    return { primary: recurringBase, count: 1 };
  }

  for (const event of events) {
    const row = buildRow(headers, {
      ...event,
      send_realtime: fromBool(event.send_realtime),
    } as any);
    await appendRow(SHEET_EVENTS, row);
  }

  await upsertEventAttendees(
    events.map((event) => ({
      event_id: event.id,
      user_id: event.user_id,
      is_active: true,
    }))
  );

  return { primary: events[0] ?? recurringBase, count: events.length || 1 };
}

export async function getEventById(id: string): Promise<EventRecord | null> {
  const { mapped } = await loadEvents();
  return mapped.find((e) => e.id === id) ?? null;
}

export async function updateEvent(
  id: string,
  input: {
    title?: string;
    category?: string;
    location?: string;
    description?: string;
    start_at?: string;
    send_realtime?: boolean;
    recurrence_rule?: string;
  }
): Promise<EventRecord | null> {
  const { headers, mapped } = await loadEvents();
  const existing = mapped.find((e) => e.id === id);
  if (!existing) return null;
  const updated: EventRecord = {
    ...existing,
    title: input.title ?? existing.title,
    category: input.category ?? existing.category,
    location: input.location ?? existing.location,
    description: input.description ?? existing.description,
    start_at: input.start_at ?? existing.start_at,
    send_realtime:
      typeof input.send_realtime === "boolean"
        ? input.send_realtime
        : existing.send_realtime,
    recurrence_rule: input.recurrence_rule ?? existing.recurrence_rule,
  };
  const rowNumber = mapped.indexOf(existing) + 2;
  const row = buildRow(headers, {
    ...updated,
    send_realtime: fromBool(updated.send_realtime),
  } as any);
  await updateRow(SHEET_EVENTS, rowNumber, row);
  return updated;
}

export async function updateEventsInSeriesFrom(input: {
  series_id: string;
  from_start_at: string;
    updates: {
      title?: string;
      category?: string;
      location?: string;
      description?: string;
      start_at?: string;
      send_realtime?: boolean;
      recurrence_rule?: string;
    };
}): Promise<number> {
  const { headers, mapped } = await loadEvents();
  const pivotMs = Date.parse(input.from_start_at);
  const shiftMs = input.updates.start_at
    ? Date.parse(input.updates.start_at) - pivotMs
    : null;
  const normalizedRule = input.updates.recurrence_rule
    ? ensureSeriesId(input.updates.recurrence_rule, input.series_id).rule
    : input.updates.recurrence_rule;
  const updates: { rowNumber: number; values: string[] }[] = [];
  let count = 0;

  mapped.forEach((event, idx) => {
    const seriesId = extractSeriesId(event.recurrence_rule);
    if (!seriesId || seriesId !== input.series_id) return;
    const eventMs = Date.parse(event.start_at);
    if (Number.isNaN(eventMs) || eventMs < pivotMs) return;

    const updated: EventRecord = {
      ...event,
      title: input.updates.title ?? event.title,
      category: input.updates.category ?? event.category,
      location: input.updates.location ?? event.location,
      description: input.updates.description ?? event.description,
      start_at:
        shiftMs !== null && !Number.isNaN(shiftMs)
          ? new Date(eventMs + shiftMs).toISOString()
          : event.start_at,
      send_realtime:
        typeof input.updates.send_realtime === "boolean"
          ? input.updates.send_realtime
          : event.send_realtime,
      recurrence_rule:
        normalizedRule !== undefined ? normalizedRule : event.recurrence_rule,
    };
    const row = buildRow(headers, {
      ...updated,
      send_realtime: fromBool(updated.send_realtime),
    } as any);
    updates.push({ rowNumber: idx + 2, values: row });
    count += 1;
  });

  if (updates.length > 0) {
    await batchUpdateRows(SHEET_EVENTS, updates);
  }
  return count;
}

export async function deleteEventsInSeriesFrom(input: {
  series_id: string;
  from_start_at: string;
}): Promise<number> {
  const { headers, mapped } = await loadEvents();
  const pivotMs = Date.parse(input.from_start_at);
  const updates: { rowNumber: number; values: string[] }[] = [];
  let count = 0;

  mapped.forEach((event, idx) => {
    const seriesId = extractSeriesId(event.recurrence_rule);
    if (!seriesId || seriesId !== input.series_id) return;
    const eventMs = Date.parse(event.start_at);
    if (Number.isNaN(eventMs) || eventMs < pivotMs) return;
    const emptyRow = buildRow(headers, {});
    updates.push({ rowNumber: idx + 2, values: emptyRow });
    count += 1;
  });

  if (updates.length > 0) {
    await batchUpdateRows(SHEET_EVENTS, updates);
  }
  return count;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const { headers, mapped } = await loadEvents();
  const existing = mapped.find((e) => e.id === id);
  if (!existing) return false;
  const rowNumber = mapped.indexOf(existing) + 2;
  const emptyRow = buildRow(headers, {});
  await updateRow(SHEET_EVENTS, rowNumber, emptyRow);
  return true;
}

export async function listEventsInRange(input: {
  from?: string;
  to?: string;
}): Promise<(EventRecord & { owner_name?: string })[]> {
  const [{ mapped: events }, { mapped: users }] = await Promise.all([
    loadEvents(),
    loadUsers(),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const withOwner = events.map((e) => ({
    ...e,
    owner_name: userMap.get(e.user_id),
  }));
  if (!input.from && !input.to) return withOwner;
  const fromMs = input.from ? Date.parse(input.from) : -Infinity;
  const toMs = input.to ? Date.parse(input.to) : Infinity;
  return withOwner.filter((e) => {
    const t = Date.parse(e.start_at);
    return t >= fromMs && t <= toMs;
  });
}

export async function upsertEventAttendees(
  input: { event_id: string; user_id: string; is_active: boolean }[]
) {
  if (input.length === 0) return;
  const { headers, mapped } = await loadEventAttendees();
  const updates: { rowNumber: number; values: string[] }[] = [];
  const appends: string[][] = [];
  const now = nowIso();

  for (const entry of input) {
    const existing = mapped.find(
      (row) => row.event_id === entry.event_id && row.user_id === entry.user_id
    );
    if (existing) {
      const rowNumber = mapped.indexOf(existing) + 2;
      const updated: EventAttendeeRecord = {
        ...existing,
        is_active: entry.is_active,
        updated_at: now,
      };
      const row = buildRow(headers, {
        ...updated,
        is_active: fromBool(updated.is_active),
      } as any);
      updates.push({ rowNumber, values: row });
    } else {
      const record: EventAttendeeRecord = {
        id: crypto.randomUUID(),
        event_id: entry.event_id,
        user_id: entry.user_id,
        is_active: entry.is_active,
        created_at: now,
        updated_at: now,
      };
      const row = buildRow(headers, {
        ...record,
        is_active: fromBool(record.is_active),
      } as any);
      appends.push(row);
    }
  }

  if (updates.length > 0) {
    await batchUpdateRows(SHEET_EVENT_ATTENDEES, updates);
  }
  for (const row of appends) {
    await appendRow(SHEET_EVENT_ATTENDEES, row);
  }
}

export async function listEventAttendees(eventId: string): Promise<
  {
    user_id: string;
    name: string;
  }[]
> {
  if (!eventId) return [];
  const event = await getEventById(eventId);
  if (event?.user_id) {
    await upsertEventAttendees([
      { event_id: eventId, user_id: event.user_id, is_active: true },
    ]);
  }
  const [{ mapped: attendees }, { mapped: users }] = await Promise.all([
    loadEventAttendees(),
    loadUsers(),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  return attendees
    .filter((row) => row.event_id === eventId && row.is_active)
    .map((row) => ({
      user_id: row.user_id,
      name: userMap.get(row.user_id) || "Unknown",
    }));
}

export async function createNotification(input: {
  type: "realtime" | "digest";
  title: string;
  body: string;
  send_at: string;
  status: "pending" | "sent" | "failed" | "skipped";
}): Promise<NotificationRecord> {
  const { headers } = await loadNotifications();
  const record: NotificationRecord = {
    id: crypto.randomUUID(),
    type: input.type,
    title: input.title,
    body: input.body,
    send_at: input.send_at,
    status: input.status,
    created_at: nowIso(),
  };
  const row = buildRow(headers, record as any);
  await appendRow(SHEET_NOTIFICATIONS, row);
  return record;
}

export async function listNotifications(): Promise<NotificationRecord[]> {
  const { mapped } = await loadNotifications();
  return mapped;
}
