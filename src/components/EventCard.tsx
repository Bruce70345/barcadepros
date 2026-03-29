"use client";

import { CalendarDays, Repeat2, Text, ToggleLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export type EventCardValues = {
  title: string;
  category: string;
  description: string;
  startAt: string;
  sendRealtime: boolean;
  isWeekly: boolean;
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

type EventCardProps = {
  mode: "create" | "edit";
  initial?: {
    id?: string;
    title?: string;
    category?: string;
    description?: string;
    start_at?: string;
    send_realtime?: boolean;
      recurrence_rule?: string;
  };
  onSave: (values: EventCardValues, id?: string) => void | Promise<void>;
  saving?: boolean;
};

export default function EventCard({ mode, initial, onSave, saving }: EventCardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (!initial?.start_at) return undefined;
    const date = new Date(initial.start_at);
    return Number.isNaN(date.getTime()) ? undefined : date;
  });

  const startDateValue = useMemo(() => {
    if (!selectedDate) return "";
    return `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(
      selectedDate.getDate(),
    )}`;
  }, [selectedDate]);
  const initialTime = useMemo(() => {
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
  }, [initial?.start_at]);
  const [timeHour, setTimeHour] = useState(initialTime.hour);
  const [timeMinute, setTimeMinute] = useState(initialTime.minute);
  const [timeMeridiem, setTimeMeridiem] = useState(initialTime.meridiem);

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      description: String(formData.get("description") || "").trim(),
      startAt,
      sendRealtime: formData.get("send_realtime") === "on",
      isWeekly: formData.get("is_weekly") === "on",
    };
    onSave(values, initial?.id);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">
            {mode === "create" ? "New event" : "Event"}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {mode === "create"
              ? ""
              : ""}
          </p>
        </div>
      </header>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          Title
          <input
            name="title"
            defaultValue={initial?.title || ""}
            placeholder="Event title"
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </label>

        <label className="block text-sm">
          Category
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <CalendarDays size={16} className="text-[var(--text-muted)]" />
            <select
              name="category"
              defaultValue={initial?.category || ""}
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
          Start time
          <div className="mt-2 grid gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 bg-[var(--surface-2)] text-[var(--text-primary)]"
                >
                  <CalendarDays size={16} className="text-[var(--text-muted)]" />
                  <span className={selectedDate ? "" : "text-[var(--text-muted)]"}>
                    {displayDate}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="bg-[var(--surface)] p-3">
                <div className="space-y-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]">
                    <span className="text-xs text-[var(--text-muted)]">Time</span>
                    <select
                      name="time_hour"
                      value={timeHour}
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
              className="custom-scrollbar w-full resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
        </label>

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
            defaultChecked={Boolean(initial?.send_realtime)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
          <span>
            <span className="text-sm font-medium">Repeat weekly</span>
            <span className="mt-1 block text-xs text-[var(--text-muted)]">
              Use the event day as the weekly schedule.
            </span>
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Repeat2 size={16} className="text-[var(--text-muted)]" />
            <input
              type="checkbox"
              name="is_weekly"
              defaultChecked={Boolean(initial?.recurrence_rule)}
              className="h-5 w-5 accent-[var(--primary)]"
            />
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--background)] disabled:opacity-60"
      >
        <ToggleLeft size={16} />
        {saving ? "Saving..." : mode === "create" ? "Add event" : "Save changes"}
      </button>
    </form>
  );
}
