# Frontend Page Blocks (Mobile+ Centered Layout)

## Layout Rules
- Viewport: mobile and above
- Container: centered single column with left/right whitespace
- Suggested max width: 720–900px
- Side padding: 16–24px
- Section spacing: 24–32px

## Page Sections (Top → Bottom)
1. App Bar
- App name
- Today button / date
- Notification status icon

2. Calendar View
- View switch: Month / Week / List
- Date grid with event dots
- Tap date to filter list

3. Event List (for selected date)
- Event card: title, time, category, realtime flag
- Recurrence badge (weekly)
- Empty state when no events

4. Quick Add Entry
- Primary action entry point
- Opens create event form

5. Create/Edit Event Form
- Title (required)
- Date + time
- Category select
- Realtime notification toggle
- Recurrence rule (weekly day selection)
- Description (optional)

6. Notification Preferences
- Receive realtime toggle
- Receive digest toggle
- Fixed quiet hours notice (22:00–08:00)
- Digest time notice (12:00 Asia/Taipei)

7. System Status (Optional)
- Permission status
- Device token bound / sync state
