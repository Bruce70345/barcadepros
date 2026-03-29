export const SHEET_HEADERS = {
  users: [
    "id",
    "email",
    "name",
    "receive_realtime",
    "receive_digest",
    "is_active",
    "is_admin",
    "deactivated_at",
    "created_at",
    "updated_at",
  ],
  user_devices: [
    "id",
    "user_id",
    "fcm_token",
    "platform",
    "updated_at",
    "is_active",
  ],
  events: [
    "id",
    "user_id",
    "title",
    "category",
    "description",
    "start_at",
    "send_realtime",
    "recurrence_rule",
    "created_at",
  ],
  notifications: [
    "id",
    "type",
    "title",
    "body",
    "send_at",
    "status",
    "created_at",
  ],
};

type SheetName = keyof typeof SHEET_HEADERS;

export function assertHeaders(sheet: SheetName, headers: string[]) {
  const expected = SHEET_HEADERS[sheet];
  const missing = expected.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    throw new Error(
      `Sheet '${sheet}' missing headers: ${missing.join(", ")}`
    );
  }
}
