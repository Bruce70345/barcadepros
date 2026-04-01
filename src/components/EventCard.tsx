"use client";

import { CalendarDays, CalendarPlus, Repeat2, Share2, Text, ToggleLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useEventAttendees } from "@/hooks/useEventAttendees";
import { useUpdateAttendance } from "@/hooks/useUpdateAttendance";

export type EventCardValues = {
  title: string;
  category: string;
  location: string;
  description: string;
  startAt: string;
  sendRealtime: boolean;
  isWeekly: boolean;
  updateRest?: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");

const toLocalInputValue = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toLocalTimeValue = (iso?: string) => {
  const value = toLocalInputValue(iso);
  return value ? value.split("T")[1] : "";
};

const to24Hour = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3].toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return `${pad(hour)}:${minute}`;
};

const getRoundedDefaultDate = () => {
  const date = new Date();
  date.setSeconds(0, 0);
  const minutes = date.getMinutes();
  const nextTen = Math.floor(minutes / 10) * 10 + 10;
  date.setMinutes(nextTen);
  return date;
};

type EventCardProps = {
  mode: "create" | "edit";
  readOnly?: boolean;
  initial?: {
    id?: string;
    user_id?: string;
    title?: string;
    category?: string;
    location?: string;
    description?: string;
    start_at?: string;
    send_realtime?: boolean;
    recurrence_rule?: string;
    owner_name?: string;
  };
  onSave: (values: EventCardValues, id?: string) => void | Promise<void>;
  saving?: boolean;
  currentUserId?: string | null;
};

export default function EventCard({
  mode,
  readOnly = false,
  initial,
  onSave,
  saving,
  currentUserId,
}: EventCardProps) {
  const defaultDate =
    mode === "create" && !initial?.start_at ? getRoundedDefaultDate() : undefined;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (initial?.start_at) {
      const date = new Date(initial.start_at);
      return Number.isNaN(date.getTime()) ? undefined : date;
    }
    return defaultDate;
  });

  const startDateValue = useMemo(() => {
    if (!selectedDate) return "";
    return `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(
      selectedDate.getDate(),
    )}`;
  }, [selectedDate]);
  const initialTime = useMemo(() => {
    if (!initial?.start_at && defaultDate) {
      const hour24 = defaultDate.getHours();
      const minute = pad(defaultDate.getMinutes());
      const meridiem = hour24 >= 12 ? "pm" : "am";
      const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
      return { hour: String(hour12).padStart(2, "0"), minute, meridiem };
    }
    const time = toLocalTimeValue(initial?.start_at);
    if (!time) return { hour: "", minute: "", meridiem: "" };
    const [h, m] = time.split(":");
    const hour24 = Number(h);
    const minute = ["00", "10", "20", "30", "40", "50"].includes(m)
      ? m
      : "00";
    const meridiem = hour24 >= 12 ? "pm" : "am";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return { hour: String(hour12).padStart(2, "0"), minute, meridiem };
  }, [defaultDate, initial?.start_at]);
  const [timeHour, setTimeHour] = useState(initialTime.hour);
  const [timeMinute, setTimeMinute] = useState(initialTime.minute);
  const [timeMeridiem, setTimeMeridiem] = useState(initialTime.meridiem);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [updateRest, setUpdateRest] = useState(false);
  const [sendRealtime, setSendRealtime] = useState(
    Boolean(initial?.send_realtime) && mode === "create"
  );
  const [isWeekly, setIsWeekly] = useState(Boolean(initial?.recurrence_rule));
  const attendeesQuery = useEventAttendees(
    mode === "edit" ? initial?.id : undefined
  );
  const updateAttendance = useUpdateAttendance();
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    if (initial?.id) {
      url.searchParams.set("event", initial.id);
    }
    return url.toString();
  }, [initial]);

  const attendees = attendeesQuery.data?.attendees ?? [];
  const isCreator = Boolean(currentUserId && initial?.user_id === currentUserId);
  const isAttending = currentUserId
    ? attendees.some((attendee) => attendee.user_id === currentUserId)
    : false;

  const displayDate = useMemo(() => {
    if (!selectedDate) return "dd/mm/yyyy";
    const dd = pad(selectedDate.getDate());
    const mm = pad(selectedDate.getMonth() + 1);
    const yyyy = selectedDate.getFullYear();
    const timeLabel =
      timeHour && timeMinute && timeMeridiem
        ? `${timeHour}:${timeMinute} ${timeMeridiem}`
        : "--:--";
    return `${dd}/${mm}/${yyyy}, ${timeLabel}`;
  }, [selectedDate, timeHour, timeMinute, timeMeridiem]);

  const shareText = useMemo(() => {
    if (mode !== "edit") return "";
    const title = (initial?.title || "").trim();
    const location = (initial?.location || "").trim();
    const description = (initial?.description || "").trim();
    const trimmedDescription =
      description.length > 220 ? `${description.slice(0, 217)}...` : description;
    const titleText = title || "join an event";
    const timeText = displayDate || "";
    const locationText = location || "";
    const line1Parts = [
      "Hey! I'd like to",
      titleText ? titleText : "",
      timeText ? `at ${timeText}` : "",
      locationText ? `at ${locationText}` : "",
    ].filter(Boolean);
    const lines = [
      `${line1Parts.join(" ")}`.replace(/\s+/g, " ").trim() + ".",
      trimmedDescription ? `Details: ${trimmedDescription}` : "",
      "Feel free to let me know if you want to join.",
      "",
    ];
    return lines.filter(Boolean).join("\n");
  }, [displayDate, initial, mode]);

  const googleCalendarHref = useMemo(() => {
    if (mode !== "edit") return "";
    const title = (initial?.title || "").trim();
    const location = (initial?.location || "").trim();
    const description = (initial?.description || "").trim();
    const startAt = initial?.start_at ? new Date(initial.start_at) : null;
    if (!startAt || Number.isNaN(startAt.getTime())) return "";
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    const toGcalDate = (date: Date) => {
      const pad2 = (v: number) => String(v).padStart(2, "0");
      return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(
        date.getUTCDate(),
      )}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(
        date.getUTCSeconds(),
      )}Z`;
    };
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title || "Event",
      dates: `${toGcalDate(startAt)}/${toGcalDate(endAt)}`,
    });
    if (location) params.set("location", location);
    if (description) params.set("details", description);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [initial, mode]);

  const whatsappShareHref = useMemo(() => {
    if (!shareUrl) return "";
    const payload = [shareText, shareUrl].filter(Boolean).join("\n");
    return `https://wa.me/?text=${encodeURIComponent(payload)}`;
  }, [shareText, shareUrl]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const startDate = String(formData.get("start_date") || "").trim();
    const hour = String(formData.get("time_hour") || "").trim();
    const minute = String(formData.get("time_minute") || "").trim();
    const meridiem = String(formData.get("time_meridiem") || "").trim();
    const startTimeValue =
      hour && minute && meridiem
        ? `${hour}:${minute} ${meridiem}`
        : "";
    const startAt =
      startDate && startTimeValue
        ? `${startDate}T${to24Hour(startTimeValue)}`
        : "";
    const values: EventCardValues = {
      title: String(formData.get("title") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      location: String(formData.get("location") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      startAt,
      sendRealtime,
      isWeekly,
      updateRest: formData.get("update_rest") === "on",
    };
    onSave(values, initial?.id);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">
            {mode === "create" ? "New event" : "Event"}
          </h3>
          {mode !== "create" && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Inviter: {initial?.owner_name || "Unknown"}
            </p>
          )}
        </div>
      </header>
      <div className="panel-with-scrollbar mt-3 flex-1 overflow-y-auto pr-1">
      {mode === "edit" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Share
          </span>
          <a
            href={whatsappShareHref || "#"}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!whatsappShareHref) event.preventDefault();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--primary)]"
          >
            <Share2 size={14} className="text-[var(--text-muted)]" />
            WhatsApp
          </a>
          <a
            href={googleCalendarHref || "#"}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!googleCalendarHref) event.preventDefault();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--primary)]"
          >
            <CalendarPlus size={14} className="text-[var(--text-muted)]" />
            Add to Google Calendar
          </a>
        </div>
      )}

      {mode === "edit" && (
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-[var(--text-primary)]">
              Going
              <span className="ml-2 text-[11px] text-[var(--text-muted)]">
                {attendeesQuery.isLoading
                  ? "…"
                  : attendees.length === 0
                    ? "0 attending"
                    : `${attendees.length} attending`}
              </span>
            </div>
            <button
              type="button"
              disabled={
                !currentUserId ||
                isCreator ||
                updateAttendance.isPending
              }
              onClick={async () => {
                if (!currentUserId || !initial?.id) return;
                if (isCreator) return;
                await updateAttendance.mutateAsync({
                  event_id: initial.id,
                  user_id: currentUserId,
                  join: !isAttending,
                });
              }}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] disabled:opacity-60"
            >
              {isCreator
                ? "Creator"
                : updateAttendance.isPending
                  ? isAttending
                    ? "Leaving..."
                    : "Joining..."
                  : isAttending
                    ? "Leave"
                    : "Join"}
            </button>
          </div>
          {!attendeesQuery.isLoading && attendees.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {attendees.map((attendee) => (
                <span
                  key={`${attendee.user_id}-${attendee.name}`}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                >
                  {attendee.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          Title
          <input
            name="title"
            defaultValue={initial?.title || ""}
            placeholder="Event title"
            disabled={readOnly}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </label>

        <label className="block text-sm">
          Category
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <CalendarDays size={16} className="text-[var(--text-muted)]" />
            <select
              name="category"
              defaultValue={initial?.category || (mode === "create" ? "Meal together" : "")}
              disabled={readOnly}
              className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="" disabled>
                Select category
              </option>
              <option value="Cultural event">Cultural event</option>
              <option value="Outdoor">Outdoor</option>
              <option value="Meal together">Meal together</option>
              <option value="day trip">day trip</option>
              <option value="weekend trip">weekend trip</option>
              <option value="longer vacation">longer vacation</option>
              <option value="Drink together">Drink together</option>
            </select>
          </div>
        </label>

        <label className="block text-sm">
          Location
          <input
            name="location"
            defaultValue={initial?.location || ""}
            placeholder="Where is it?"
            disabled={readOnly}
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </label>

        <label className="block text-sm">
          Start time
          <div className="mt-2 grid gap-2">
            <Popover
              open={isDateOpen}
              onOpenChange={(nextOpen) => {
                setIsDateOpen(nextOpen);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={readOnly}
                  className="w-full justify-start gap-2 bg-[var(--surface-2)] text-[var(--text-primary)]"
                >
                  <CalendarDays size={16} className="text-[var(--text-muted)]" />
                  <span className={selectedDate ? "" : "text-[var(--text-muted)]"}>
                    {displayDate}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="z-[10001] bg-[var(--surface)] p-3"
              >
                <div className="space-y-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={readOnly ? undefined : setSelectedDate}
                  initialFocus
                />
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]">
                    <span className="text-xs text-[var(--text-muted)]">Time</span>
                    <select
                      name="time_hour"
                      value={timeHour}
                      disabled={readOnly}
                      onChange={(event) => setTimeHour(event.target.value)}
                      className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
                    >
                      <option value="" disabled>
                        --
                      </option>
                      <option value="01">01</option>
                      <option value="02">02</option>
                      <option value="03">03</option>
                      <option value="04">04</option>
                      <option value="05">05</option>
                      <option value="06">06</option>
                      <option value="07">07</option>
                      <option value="08">08</option>
                      <option value="09">09</option>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                    </select>
                    <select
                      name="time_minute"
                      value={timeMinute}
                      disabled={readOnly}
                      onChange={(event) => setTimeMinute(event.target.value)}
                      className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
                    >
                      <option value="" disabled>
                        --
                      </option>
                      <option value="00">00</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="30">30</option>
                      <option value="40">40</option>
                      <option value="50">50</option>
                    </select>
                    <select
                      name="time_meridiem"
                      value={timeMeridiem}
                      disabled={readOnly}
                      onChange={(event) => setTimeMeridiem(event.target.value)}
                      className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
                    >
                      <option value="" disabled>
                        --
                      </option>
                      <option value="am">am</option>
                      <option value="pm">pm</option>
                    </select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <input type="hidden" name="start_date" value={startDateValue} />
            <input type="hidden" name="time_hour" value={timeHour} />
            <input type="hidden" name="time_minute" value={timeMinute} />
            <input type="hidden" name="time_meridiem" value={timeMeridiem} />
          </div>
        </label>

        <label className="block text-sm">
          Description
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <Text size={16} className="mt-0.5 text-[var(--text-muted)]" />
            <textarea
              name="description"
              rows={6}
              defaultValue={initial?.description || ""}
              placeholder="Add details, meetup point, or notes."
              disabled={readOnly}
              className="custom-scrollbar w-full resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
        </label>

        {mode === "create" && (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
            <span>
              <span className="text-sm font-medium">Realtime notification</span>
              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                Send notification immediately after creation.
              </span>
            </span>
            <input
              type="checkbox"
              name="send_realtime"
              checked={sendRealtime}
              disabled={readOnly}
              onChange={(event) => {
                const checked = event.target.checked;
                setSendRealtime(checked);
                if (checked) setIsWeekly(false);
              }}
              className="h-5 w-5 accent-[var(--primary)]"
            />
          </label>
        )}

        <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
          <span>
            <span className="text-sm font-medium">Repeat weekly</span>
            <span className="mt-1 block text-xs text-[var(--text-muted)]">
              Use the event day as the weekly schedule.
            </span>
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <input
              type="checkbox"
              name="is_weekly"
              checked={isWeekly}
              disabled={readOnly || mode === "edit"}
              onChange={(event) => {
                const checked = event.target.checked;
                setIsWeekly(checked);
                if (checked) setSendRealtime(false);
              }}
              className="h-5 w-5 accent-[var(--primary)]"
            />
          </span>
        </label>

        {mode === "edit" && Boolean(initial?.recurrence_rule) && (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
            <span>
              <span className="text-sm font-medium">Update the rest</span>
              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                Apply changes to this and all future weekly events.
              </span>
            </span>
            <input
              type="checkbox"
              name="update_rest"
              checked={updateRest}
              disabled={readOnly}
              onChange={(event) => setUpdateRest(event.target.checked)}
              className="h-5 w-5 accent-[var(--primary)]"
            />
          </label>
        )}
      </div>

      </div>
      {!readOnly && (
        <button
          type="submit"
          disabled={saving}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--background)] disabled:opacity-60"
        >
          <ToggleLeft size={16} />
          {saving ? "Saving..." : mode === "create" ? "Add event" : "Save changes"}
        </button>
      )}
    </form>
  );
}
