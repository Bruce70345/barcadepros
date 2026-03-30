# 行事曆活動與通知系統 Spec v1

## 目標
提供使用者建立活動、決定是否即時通知，並在每日固定時間推送未來 72 小時內的活動摘要。

## Color Palette（Dark, warm + playful neon, less AI）
品牌方向：深色背景、生活感溫暖、活潑有趣；保留酒吧霓虹感，但降低飽和度與紫藍 AI 感。

- Background: `#0E1117`
- Surface: `#151A23`
- Surface-2: `#1D2430`
- Border: `#2C3648`
- Text Primary: `#E9EEF7`
- Text Secondary: `#B3BDD1`
- Text Muted: `#8B97AF`
- Primary (neon-rose): `#E65A8A`
- Primary Strong: `#D83E73`
- Accent (amber): `#F0A64A`
- Highlight: `#FFD08A`
- Success: `#2CCCA0`
- Danger: `#F06C6C`

## 核心規則
- 活動有分類（如：吃飯、戶外活動、文化體驗、酒吧、週末旅行、大旅行），僅供展示與篩選，不影響推播邏輯。
- 活動可填 `location` 作為地點描述，僅供顯示與搜尋。
- 建立活動時可選擇是否「即時通知」。
- 使用者可設定是否接收「即時通知」與「彙整通知」。
- 靜音時段固定為 22:00-08:00，靜音時段內不接收即時通知（不需存使用者設定）。
- 彙整通知固定於 Asia/Taipei 每日 12:00 發送。
- 即時通知需包含事件建立者本人。

## 通知行為
### 即時通知
- 觸發條件：建立活動時 `send_realtime = true`
- 收件條件：`receive_realtime = true` 且不在靜音時段內
- 發送對象包含建立者本人
- 靜音時段內不發送，不做延遲補發

### 彙整通知
- 觸發時間：每日 Asia/Taipei 12:00
- 收件條件：`receive_digest = true`
- 判斷條件：未來 72 小時內有活動（數量 > 0）
- 通知內容需包含活動數量（例如：未來 72 小時內有 3 個活動）

## 建議資料結構（Google Sheets）

### users
- id
- email
- name
- receive_realtime (TRUE/FALSE)
- receive_digest (TRUE/FALSE)
- is_active (TRUE/FALSE)
- is_admin (TRUE/FALSE)
- deactivated_at
- created_at

規則：`name` 為必填，`email` 可為空。

### user_devices
- id
- user_id
- fcm_token
- platform
- updated_at
- is_active

### events
- id
- user_id
- title
- category
- location
- description
- start_at
- send_realtime (TRUE/FALSE)
- recurrence_rule
- created_at

### notifications
- id
- type (realtime/digest)
- title
- body
- send_at
- status (pending/sent/failed/skipped)
- created_at

## 推播流程（後端 / 排程）

### 即時通知流程
1. 建立活動
2. 若 `send_realtime = true`，篩選 `receive_realtime = true` 的使用者
   - 同時只選 `users.is_active = TRUE`
3. 排除靜音時段內使用者
4. 發送推播（包含建立者本人）
5. 在 `notifications` 紀錄一筆

### 彙整通知流程（每日 12:00）
1. 查詢未來 72 小時內活動數量
2. 若數量 > 0，對 `receive_digest = true` 使用者發送彙整通知
   - 同時只選 `users.is_active = TRUE`
3. 內容包含活動數量
4. 在 `notifications` 紀錄一筆
5. 排程方式（建議）：使用 GitHub Actions Cron 每日 12:00 呼叫 `POST /api/notifications/send-digest`

## FCM Token 更新策略（參考既有專案流程）
- 主要依靠前端重新取得 token 後更新後端，沒有獨立的「token 失效監聽」事件。
- 觸發時機：
 1. 初始化 Messaging 完成後，呼叫 `getFcmToken()` 取得目前 token
 2. 通知權限變更為 `granted` 時，再呼叫 `getFcmToken()`
- `getFcmToken()` 核心行為：
 1. 呼叫 `getToken()` 取得目前 FCM token
 2. 與 IndexedDB 本地儲存的舊 token 比對
 3. 若不同：
    - 更新本地 token
    - 若已有 `fcmTokenId` 則呼叫 `UpdateFCMToken`
    - 若沒有 `fcmTokenId` 則呼叫 `SendFCMToken`
 4. 登出時呼叫 `DeleteFCMToken` 並清除本地 token

## FCM Token 註冊（去重與啟用）
- 註冊/更新時先檢查是否已有相同裝置紀錄（建議唯一鍵：`user_id + platform` 或 `fcm_token`）。
- 若已存在，更新 `fcm_token`、`updated_at`，並將 `is_active = TRUE`。
- 若不存在，新增一筆並設 `is_active = TRUE`。

## 重複事件規則（RRULE）
只支援「每週一次」的簡單重複。

### 支援範圍（v1）
- 頻率固定為 `WEEKLY`
- 週期固定為 `INTERVAL=1`
- 週期內指定：
  - `BYDAY`（例如 `MO`、`TU`）

### 範例
- 每週一：`FREQ=WEEKLY;INTERVAL=1;BYDAY=MO`
- 每週五：`FREQ=WEEKLY;INTERVAL=1;BYDAY=FR`

### 資料儲存
`events.recurrence_rule` 欄位存 RRULE 字串，未重複則留空。

## 非目標（本版不做）
- 依分類訂閱通知
- 通知送達追蹤（notification_recipients）

## Phase 2（v2）- 活動回覆與投票
### 活動回覆（RSVP）
- 使用者可對活動回覆是否參加：
  - `going` / `maybe` / `not_going` / `no_response`
- 一個使用者對同一活動只保留一筆最新回覆（可更新）。
- 活動建立者也可以回覆自己的活動。

### 投票功能
- 每個活動可建立 0~N 個投票（例如：聚會時間、地點、主題）。
- 每個投票包含多個選項，使用者可選擇 1 個選項。
- 使用者可更新自己的投票選擇（以最後一次為準）。

### 建議資料結構（Google Sheets）
#### event_rsvps
- id
- event_id
- user_id
- status (going/maybe/not_going/no_response)
- updated_at

#### event_polls
- id
- event_id
- title
- created_at

#### event_poll_options
- id
- poll_id
- label
- order

#### event_votes
- id
- poll_id
- option_id
- user_id
- created_at

## 註銷規則（裝置 / 服務）
使用者可選擇註銷單一裝置或註銷整個服務。

### 註銷裝置
- 方式：將對應 `user_devices.is_active` 設為 `FALSE` 或刪除該筆
- 效果：該裝置不再接收任何通知

### 註銷服務
- 方式：將 `users.is_active` 設為 `FALSE` 並寫入 `deactivated_at`
- 同時將該使用者所有 `user_devices.is_active` 設為 `FALSE`
- 效果：該使用者不再接收任何通知，後續推播流程需排除

## 前端規則
- 採 MVVM 架構。
- 所有 API 互動必須使用 React Query：
  - 讀取使用 `useQuery`
  - 寫入使用 `useMutation`
- 不直接在 UI 元件內寫 API 呼叫；以 hook 封裝資料存取。

## 安全與防濫用（小專案版本）
因為接近訪客模式，採用最小防線即可。

### 表單防機器人
- 使用 Turnstile 驗證（前端表單送出時帶 token，後端驗證）。
- 規則：所有「會寫入/觸發」的 API 都需要 Turnstile，**例外**：
  - `GET` 類型 API
  - `POST /api/devices/upsert`（更新 FCM token）

適用範圍（需 Turnstile）：
- 建立使用者（`POST /api/users/upsert`）
- 事件 CRUD（`POST/PATCH/DELETE /api/events`）
- 即時通知（`POST /api/notifications/send-realtime`）

### 簡單 Rate Limit
- 以 IP 為單位限制寫入頻率（例：每分鐘 10 次）。

### 輸入長度限制
- `email` < 200
- `name` < 50
- `title` < 100
- `location` < 200
- `description` < 1000

### 推播 API 限制
- `/api/notifications/send-digest` 只允許 Cron 呼叫（使用 secret header）。
- `/api/notifications/send-realtime` 僅供後端內部使用（事件建立後自動觸發）。

## 使用者規則
- 使用者可修改自己的名稱（更新 `users.name`）。

## 事件擁有者
- `events.user_id` 為事件擁有者。
- 後續事件更新/刪除需驗證 `user_id` 與事件擁有者一致。
