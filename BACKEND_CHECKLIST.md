# Backend Checklist

以下是依據目前 `SPEC.md` 與實作差異整理的「待完成事項」。請依序勾選。

## 安全與防濫用
- [x] Turnstile 驗證：在需要寫入/觸發的 API 中驗證 token
  - 需 Turnstile：`POST /api/users/upsert`、事件 CRUD、`POST /api/notifications/send-realtime`
  - 例外：`GET` 類型、`POST /api/devices/upsert`
- [x] Rate Limit：以 IP 為單位限制寫入頻率（例：每分鐘 10 次）
- [x] 推播 API Secret 檢查：
  - `/api/notifications/send-digest` 僅允許 Cron 呼叫
  - `/api/notifications/send-realtime` 僅供後端內部使用

## 資料驗證
- [x] 欄位長度限制（後端）：
  - `email` < 200
  - `name` < 50
  - `title` < 100
  - `description` < 1000
- [x] 日期格式驗證：`start_at` / `now` 必須為有效 ISO 時間

## 使用者
- [x] `users.name` 為必填，`users.email` 可為空
- [x] `users.is_admin` 欄位已加入並可讀寫
- [x] `PATCH /api/users/name` 可更新名稱

## 事件擁有者
- [x] 事件更新/刪除需驗證 `user_id` 為擁有者

## 通知流程
- [x] 事件建立後自動觸發即時通知（`send_realtime = true`）
- [x] 靜音時段跳過時，通知狀態標記（可用 `skipped`）

## Sheets 連線
- [x] headers mismatch 時提供明確錯誤（欄位名稱不符）
- [x] GET /api/devices 預設只回 `is_active = TRUE`

## 路由與文件
- [x] `API.md` 與實作保持一致（/api 與 /api/v1）
- [x] 若保留 `/api/v1`，標示為測試用途
