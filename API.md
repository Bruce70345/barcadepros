# API 規格（MVP）

以下為目前 Spec 對應的最小可用 API 清單。

> 註：`/api/v1/*` 為測試用途（保留舊版測試路由）。

## 1) 使用者

### POST /api/users/upsert
建立或更新使用者（name 必填，email 可選）。

Request
```json
{
  "name": "Alice",
  "email": "user@example.com",
  "turnstile_token": "token_from_turnstile"
}
```

Response
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "Alice",
  "receive_realtime": true,
  "receive_digest": true,
  "is_admin": false
}
```

### PATCH /api/users/name
更新使用者名稱。

Request
```json
{
  "user_id": "user_123",
  "name": "Alice Chen",
  "turnstile_token": "token_from_turnstile"
}
```

Response
```json
{
  "ok": true
}
```

### PATCH /api/users/preferences
更新通知偏好。

Request
```json
{
  "user_id": "user_123",
  "receive_realtime": true,
  "receive_digest": false
}
```

Response
```json
{
  "ok": true
}
```

### POST /api/users/deactivate
註銷整個服務（停用使用者並停用所有裝置）。

Request
```json
{
  "user_id": "user_123"
}
```

Response
```json
{
  "ok": true
}
```

## 2) 裝置 / FCM Token

### POST /api/devices/upsert
上傳或更新 FCM token。

Request
```json
{
  "user_id": "user_123",
  "fcm_token": "fcm_token_value",
  "platform": "web"
}
```

Response
```json
{
  "id": "device_456",
  "is_active": true
}
```

規則
- 先檢查是否已有相同裝置紀錄（建議唯一鍵：`user_id + platform` 或 `fcm_token`）。
- 若已存在：更新 `fcm_token`、`updated_at`，並設 `is_active = TRUE`。
- 若不存在：新增一筆並設 `is_active = TRUE`。

### GET /api/devices
取得使用者的裝置與 token 列表。

Query
- `user_id`：使用者 ID
- `active`：預設只回傳啟用裝置；設為 `false` 則回傳全部

Response
```json
[
  {
    "id": "device_456",
    "user_id": "user_123",
    "fcm_token": "fcm_token_value",
    "platform": "web",
    "is_active": true
  }
]
```

### PATCH /api/devices/:id
標記 token 失效或重新啟用。

Request
```json
{
  "is_active": false
}
```

Response
```json
{
  "ok": true
}
```

### DELETE /api/devices/:id
移除裝置 token（註銷該裝置）。

Response
```json
{
  "ok": true
}
```

## 3) 事件

### POST /api/events
建立事件。

Request
```json
{
  "user_id": "user_123",
  "title": "週末小旅行",
  "category": "週末旅行",
  "description": "集合地點：台北車站",
  "start_at": "2026-04-05T09:00:00+08:00",
  "send_realtime": true,
  "recurrence_rule": true,
  "turnstile_token": "token_from_turnstile"
}
```

Response
```json
{
  "id": "event_789"
}
```

### GET /api/events
取得事件列表。

Query
- `from`：ISO datetime
- `to`：ISO datetime

Response
```json
[
  {
    "id": "event_789",
    "title": "週末小旅行",
    "category": "週末旅行",
    "description": "集合地點：台北車站",
    "start_at": "2026-04-05T09:00:00+08:00",
    "send_realtime": true,
    "recurrence_rule": true
  }
]
```

### PATCH /api/events/:id
更新事件（需事件擁有者或 admin）。

Request
```json
{
  "user_id": "user_123",
  "title": "更新後標題",
  "description": "更新內容",
  "start_at": "2026-04-06T10:00:00+08:00",
  "send_realtime": false,
  "recurrence_rule": false,
  "turnstile_token": "token_from_turnstile"
}
```

Response
```json
{
  "ok": true
}
```

### DELETE /api/events/:id
刪除事件（需事件擁有者或 admin）。

Request
```json
{
  "user_id": "user_123",
  "turnstile_token": "token_from_turnstile"
}
```

Response
```json
{
  "ok": true
}
```

## 4) 通知

### POST /api/notifications/send-realtime
發送即時通知（建立事件後由後端呼叫，內部用途）。

Request
```json
{
  "event_id": "event_789",
  "turnstile_token": "token_from_turnstile"
}
```

Response
```json
{
  "ok": true
}
```

### POST /api/notifications/send-digest
每日 12:00 排程呼叫，發送 72 小時內彙整通知。

Request
```json
{
  "now": "2026-03-28T12:00:00+08:00"
}
```

Response
```json
{
  "ok": true,
  "count": 3
}
```
