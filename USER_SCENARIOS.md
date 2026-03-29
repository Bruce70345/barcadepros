# 使用者使用情境（MVP）

以下是這個行事曆 + 推播小專案的典型使用情境與流程。

## 1) 新使用者第一次使用
1. 使用者輸入 `name`（可選輸入 email）
2. 前端取得 Turnstile token
3. 呼叫 `POST /api/users/upsert`
4. 後端建立使用者，回傳 `user_id`

## 2) 使用者允許通知並更新 FCM token
1. 前端呼叫 `getFcmToken()` 取得 token
2. 呼叫 `POST /api/devices/upsert` 更新 token
3. 後端去重並標記 `is_active = TRUE`

## 3) 建立活動（不即時通知）
1. 使用者輸入標題、時間、描述（可選）
2. Turnstile 驗證後呼叫 `POST /api/events`
3. `send_realtime = false`
4. 只建立事件，不發推播

## 4) 建立即時活動（即時通知）
1. 使用者建立事件並勾選「即時通知」
2. Turnstile 驗證後呼叫 `POST /api/events`
3. 後端建立事件後自動觸發即時通知
4. 靜音時段（22:00–08:00）會跳過，通知記錄為 `skipped`

## 5) 每日摘要通知
1. GitHub Actions 每天台灣時間 12:00 打 `/api/notifications/send-digest`
2. 後端查詢未來 72 小時活動數量
3. 若有活動則發送摘要推播

## 6) 使用者修改名稱
1. 使用者輸入新名稱
2. Turnstile 驗證後呼叫 `PATCH /api/users/name`
3. 後端更新 `users.name`

## 7) 事件更新 / 刪除
1. 使用者修改或刪除事件
2. Turnstile 驗證
3. 後端檢查 `user_id` 是否為事件擁有者（或 admin）
4. 通過才可更新/刪除

## 8) 服務註銷
1. 使用者選擇註銷服務
2. 呼叫 `POST /api/users/deactivate`
3. 後端將使用者 `is_active = FALSE`，並停用所有裝置

