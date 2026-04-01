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
    "location",
    "description",
    "start_at",
    "send_realtime",
    "recurrence_rule",
    "created_at",
  ],
  event_attendees: [
    "id",
    "event_id",
    "user_id",
    "is_active",
    "created_at",
    "updated_at",
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

const OPTIONAL_HEADERS: Partial<Record<SheetName, string[]>> = {
  users: ["updated_at"],
};

export function assertHeaders(sheet: SheetName, headers: string[]) {
  const expected = SHEET_HEADERS[sheet];
  const optional = OPTIONAL_HEADERS[sheet] || [];
  const missing = expected.filter((h) => !headers.includes(h));
  const missingRequired = missing.filter((h) => !optional.includes(h));
  if (missingRequired.length > 0) {
    throw new Error(
      `Sheet '${sheet}' missing headers: ${missingRequired.join(", ")}`
    );
  }
}
